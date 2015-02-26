///<reference path='refs.ts'/>

module TDev {
    //declare class RenderState;

    export interface IndexedString
    {
        idx:number;
        s:string;
    }
}

module TDev.AST {


    export var api = TDev.api;
    var currentNodeId = 1;

    export var proMode = false;
    export var blockMode = false;
    export var legacyMode = true;

    export var propRenames:StringMap<string> = {};
    export var crossKindRenames:StringMap<string> = {};

    export function reset()
    {
        currentNodeId = 1;
        api.cleanup()
    }

    export function stableReset(entropy:string)
    {
        reset()
        var r = new Random.RC4()
        r.addEntropy(Util.stringToUint8Array(Util.toUTF8(entropy)))
        uniqueAstId = (len) => r.uniqueId(len);
    }

    export enum CanBeOffloadedState {
        No = 0x0000,
        Yes = 0x0001,
        Unknown = 0x0002,
        AssumeYes = 0x0003,
    }

    export class AstNode
    {
        public nodeId:number = currentNodeId++;
        public stableId:string;
        public errorIsOk:boolean;
        public _kind:Kind;
        public _error:string = null;
        public isInvisible:boolean;
        public annotations:RT.AstAnnotation[];

        private isAstNode() { return true; }
        public isPlaceholder() { return false; }
        public hasValue() { return false; }
        public isStmt() { return false; }
        public getKind():Kind { return this._kind; }
        public nodeType():string { return null; }
        public children():AstNode[] { return []; }
        public errorOf(e:ExprHolder)
        {
            if (this._error != null) return this._error;
            else return e.getError();
        }

        private shouldCopy(propName:string)
        {
            return propName != "kind" && propName != "type";
        }

        public getError() { return this._error; }
        public setError(m:string) { this._error = m; }
        public clearError() { this._error = null; }

        public writeTo(tw:TokenWriter) : void
        {
            Util.oops("writeTo not implemented");
        }

        public serialize() : string
        {
            var tw = TokenWriter.forStorage();
            this.writeTo(tw);
            return tw.finalize();
        }

        public accept(v:NodeVisitor):any
        {
            Util.oops("accept not implemented");
            return null;
        }

        static freshNameCore(n:string, nameExists:(s:string) => boolean)
        {
            if (n == "") n = "x";
            if (!nameExists(n)) return n;

            if (n == "i") {
                var better = ["j", "k", "l", "m", "n"].filter((n) => !nameExists(n))[0];
                if (better) return better;
            }

            var prefix = TDev.RT.String_.trim_end(n, "0123456789");
            var k = parseFloat(n.substr(prefix.length)) || 2;
            while (nameExists(prefix + k)) k++;
            return prefix + k;
        }



        public canBeOffloaded(): boolean {
            var res = true;
            if (!this.isPlaceholder()) {
                var children = this.children();
                for (var i = 0; i < children.length; i++) {
                    if (!children[i].canBeOffloaded()) {
                        res = false;
                        break;
                    }
                }
            }
            return res;
        }
    }


    export interface IStableNameEntry
    {
        getName():string;
        initStableName(refresh:boolean);
        getStableName():string;
        setStableName(s:any);
        deriveStableName(st:Stmt,ix:number);
    }

    export var uniqueAstId : (len:number) => string = (len) => Random.uniqueId(len);


    // -------------------------------------------------------------------------------------------------------
    // Statements
    // -------------------------------------------------------------------------------------------------------

    export class Stmt
        extends AstNode
        implements IStableNameEntry
    {
        private _name: string;

        private stableName: string;
        private stableVersions : string[];
        public tutorialWarning: string;

        constructor() {
            super()
        }
        public isStmt() { return true; }
        public isExecutableStmt() { return false; }
        public primaryBody():Block { return null; }
        public calcNode():ExprHolder { return null; }
        public children():AstNode[] { return this.calcNode() != null ? [this.calcNode()] : []; }
        public getError()
        {
            var c = this.calcNode();
            if (c != null)
                return this.errorOf(c);
            else
                return this._error;
        }

        public debuggerRenderContext: {
            isOnStackTrace ?: boolean;
            isBreakPoint?: boolean;
            isCurrentExecPoint?: boolean;
        } = {};
        public renderedAs:HTMLElement;
        public renderedAsId:string;
        public renderState:any; //RenderState;
        public loopVariable():LocalDef { return null }
        public setupForEdit() { }

        // if this instanceof Block, these are attached at the beginning of the body, and otherwise after the the current statement
        public diffStmts:Stmt[];
        public diffAltStmt:Stmt;
        public diffStatus:number; // -1, 0, +1, -N for moved old statements
        public diffFeatures:any;
        public stepState:any;

        public isCommentedOut()
        {
            return this.parent && (this.parent.isTopCommentedOut() || this.parent.isCommentedOut())
        }

        public isTopCommentedOut() { return false }

        public parent:Stmt;
        public parentBlock():AST.Block { return this.parent instanceof AST.Block ? <AST.Block> this.parent : null; }
        public isLoneChild() { return this.parentBlock().stmts.length == 1; }
        public isLastChild() { return this.parentBlock().stmts.peek() == this; }
        public isFirstChild() { return this.parentBlock().stmts[0] == this; }
        public allowSimplify() { return false }
        public onDelete() { }

        public isFirstNonComment() { return this.parentBlock().firstNonComment() == this; }
        public isLastNonComment() { return this.parentBlock().lastNonComment() == this; }

        public getName(): string { return this._name; }
        public setName(s: string) {
            this._name = s;
        }

        public getStableName() : string {
            return this.stableName;
        }

        // input should be a string or an array of strings
        public setStableName(s : any) {
            if(s instanceof Array) {
                this.stableName = s ? s.pop() : undefined;
                // this.stableVersions = s;
                this.stableVersions = undefined;
            } else {
                this.stableName = s;
                this.stableVersions = undefined;
            }
            //console.log(">>>>> setStableName: "+this+" -> "+this.stableName+", ["+this.stableVersions+"]");
            //if(this.stableName=="main") console.log(">>>>> "+(Script ? Script.serialize() : "undef"));
        }

        public initStableName(refresh = false) {
            if(!this.stableName || refresh) {
                this.setStableName(uniqueAstId(16));
            }
        }

        public deriveStableName(s:Stmt, ix:number) {
            this.setStableName(s.getStableName()+"$"+ix);
        }

        public writeId(tw:TokenWriter)
        {
            if(this.stableVersions) {
                this.stableVersions.forEach(x => tw.uniqueId(x));
            }
            tw.uniqueId(this.getStableName());
        }

        public writeIdOpt(tw:TokenWriter)
        {
            this.writeId(tw);
        }

        public parentApp():App
        {
            var pa = this.parentAction()
            if (pa) return pa.parent;
            return null;
        }

        public parentAction():Action
        {
            for (var p = this.parent; p && !(p instanceof ActionHeader); p = p.parent)
                ;
            if (p) return (<ActionHeader>p).action;
            else return null;
        }

        public helpTopic()
        {
            return this.nodeType();
        }

        public forSearch() { return ""; }

        public notifyChange()
        {
            if (this.parent) this.parent.notifyChange();
        }

        public innerBlocks()
        {
            return <Block[]>this.children().filter(c => c instanceof Block)
        }

        public isDescendant(stmt: Stmt) : boolean {
            while (!!stmt) {
                stmt = stmt.parent;
                if (stmt == this) return true;
            }
            return false;
        }

        public matches(d:AstNode) {
            var n = this.calcNode()
            if (n)
                for (var i = 0; i < n.tokens.length; ++i)
                    if (n.tokens[i].matches(d)) return true;
            return false
        }
    }

    export class Comment
        extends Stmt
    {
        public text:string;
        public mdDecl:AST.Decl;
        constructor() {
            super()
        }
        public nodeType() { return "comment"; }
        public accept(v:NodeVisitor) { return v.visitComment(this); }
        public writeTo(tw:TokenWriter)
        {
            this.writeIdOpt(tw);
            tw.comment(this.text);
        }
        public forSearch() { return this.text.toLowerCase(); }
    }

    export class FieldComment
        extends Comment
    {
        constructor (private field: AST.RecordField) {
            super()
        }

        public notifyChange() {
            this.field.description =
                this.parent.children().map(c => (<Comment> c).text)
                .join("\n");
            if (!this.field.description)
                (<CodeBlock> this.parent).setChildren([]);

            super.notifyChange();
        }
    }

    export class Block
        extends Stmt
    {
        public stmts:Stmt[];
        constructor() {
            super()
        }
        public nodeType() { return "block"; }
        public children() { return this.stmts; }
        public immutableReason = null;
        public count() { return this.stmts.length; }

        public newChild(s:Stmt) { s.parent = this; }

        public setChild(i:number, s:Stmt)
        {
            this.stmts[i] = s;
            this.newChild(s);
            this.notifyChange();
        }

        public setChildren(s:Stmt[])
        {
            this.stmts = s;
            this.stmts.forEach((q:Stmt) => this.newChild(q))
            this.notifyChange();
        }

        public push(s:Stmt)
        {
            this.stmts.push(s);
            this.newChild(s);
            this.notifyChange();
        }

        public pushRange(s:Stmt[])
        {
            this.stmts.pushRange(s);
            this.stmts.forEach((q:Stmt) => this.newChild(q))
            this.notifyChange();
        }

        public writeTo(tw:TokenWriter)
        {
            tw.beginBlock();
            this.stmts.forEach((s:Stmt) => { s.writeTo(tw); });
            tw.endBlock();
        }

        public emptyStmt():Stmt { return Util.abstract() }
        public allowEmpty() { return false; }
        public allowAdding() { return true; }
        public allowAddOf(n:Stmt) { return false }

        public isBlockPlaceholder()
        {
            return this.stmts.length == 0 || (this.stmts.length == 1 && this.stmts[0].isPlaceholder());
        }

        public forEach(f:(s:Stmt)=>void):void { this.stmts.forEach(f) }
        public map(f: (s: Stmt) => any): any[]{ return this.stmts.map(f); }

        public firstNonComment(): Stmt {
            return this.stmts.filter(stmt => stmt.nodeType() !== "comment")[0];
        }

        public lastNonComment(): Stmt {
            return this.stmts.filter(stmt => stmt.nodeType() !== "comment").peek();
        }

        public stmtsWithDiffs(): Stmt[]
        {
            if (this.diffStmts || this.stmts.some(s => !!s.diffStmts)) {
                var res:AST.Stmt[] = []
                if (this.diffStmts) res.pushRange(this.diffStmts)
                this.stmts.forEach(s => {
                    res.push(s)
                    if (s.diffStmts)
                        res.pushRange(s.diffStmts)
                })
                return res;
            } else {
                return this.stmts;
            }
        }

        public forEachInnerBlock(f:(b:Block)=>void)
        {
            for (var i = 0; i < this.stmts.length; ++i) {
                var ch = this.stmts[i].children()
                for (var j = 0; j < ch.length; ++j) {
                    if (ch[j] instanceof Block)
                        f(<Block>ch[j])
                }
            }
        }
    }

    export enum BlockFlags {
        None         = 0x0000,
        IsPageRender = 0x0001,
        IsPageInit   = 0x0002,
    }

    export class CodeBlock
        extends Block
    {
        constructor() {
            super()
        }
        public flags:BlockFlags;
        public emptyStmt() { return Parser.emptyExprStmt(); }
        public accept(v:NodeVisitor) { return v.visitCodeBlock(this); }
        public nodeType() { return "codeBlock"; }
        public newlyWrittenLocals:LocalDef[];
        public allowAddOf(n:Stmt) { return n && n.isExecutableStmt() }

        public writeTo(tw:TokenWriter)
        {
            tw.beginBlock();
            for (var i = 0; i < this.stmts.length; ++i) {
                var s = this.stmts[i]
                if (s instanceof If && isElseIf(this.stmts[i+1])) {
                    var si = <If>s;
                    si.writeCore(tw)
                    var numOpen = 1
                    tw.keyword("else").op("{")
                    while (true) {
                        if (!isElseIf(this.stmts[i+1]))
                            break;
                        i++;
                        si = <If>this.stmts[i];
                        si.writeCore(tw)
                        tw.keyword("else");
                        if (!si.rawElseBody.isBlockPlaceholder()) {
                            tw.node(si.rawElseBody);
                            break;
                        }
                        tw.op("{");
                        numOpen++;
                    }
                    while (numOpen-- > 0)
                        tw.op("}");
                    tw.nl();
                } else {
                    s.writeTo(tw)
                }
            }
            tw.endBlock();
        }
    }

    export class ConditionBlock
        extends Block
    {
        constructor() {
            super()
        }
        public emptyStmt() { return Parser.emptyCondition(); }
        public accept(v:NodeVisitor) { return v.visitConditionBlock(this); }
        public nodeType() { return "conditionBlock"; }
        public allowAddOf(n:Stmt) { return n instanceof ForeachClause }
        public allowEmpty() { return true; }
    }

    export class ParameterBlock
        extends Block
    {
        constructor() {
            super()
            this.stmts = [];
        }
        public allowEmpty() { return true; }
        public emptyStmt()
        {
            var isOut = (<ActionHeader>this.parent).outParameters == this;
            var r = new ActionParameter(mkLocal((<AST.ActionHeader>this.parent).action.nameLocal(isOut ? "r" : "p"), api.core.Number));
            r.parent = this;
            return r;
        }
        public accept(v:NodeVisitor) { return v.visitParameterBlock(this); }
        public allowAddOf(n:Stmt) { return n instanceof ActionParameter }

        // no need to offload parameters
        public canBeOffloaded() { return false; }
        public nodeType() { return "parameterBlock"; }

        public children()
        {
            if (this.parent && (<ActionHeader>this.parent).inParameters == this) {
                var act = (<ActionHeader>this.parent).action
                if (act && act.modelParameter)
                    return [<Stmt>act.modelParameter].concat(this.stmts)
            }

            return this.stmts
        }
    }

    export class BindingBlock
        extends Block
    {
        constructor() {
            super()
            this.stmts = [];
        }
        public allowEmpty() { return true; }
        public emptyStmt():Stmt { return null; } // no can do
        public accept(v:NodeVisitor) { return v.visitBindingBlock(this); }
        public nodeType() { return "bindingBlock"; }
        public allowAddOf(n:Stmt) { return n instanceof Binding }
    }

    export class ResolveBlock
        extends Block
    {
        constructor() {
            super()
            this.stmts = [];
        }
        public allowEmpty() { return true; }
        public emptyStmt():Stmt { return null; } // no can do
        public accept(v:NodeVisitor) { return v.visitResolveBlock(this); }
        public push(s:Stmt) { this.stmts.push(s); s.parent = this; }
        public nodeType() { return "resolveBlock"; }
        public allowAddOf(n:Stmt) { return n instanceof ResolveClause }
    }

    export class FieldBlock
        extends Block
    {
        constructor() {
            super()
            this.stmts = [];
        }

        public allowEmpty() { return true; }
        public isKeyBlock() { return this.parentDef.keys == this; }
        public allowAddOf(n:Stmt) { return n instanceof RecordField }

        public mkUniqName(basename: string) {
            var names = this.parentDef.getFields().map((f) => f.getName());
            return AstNode.freshNameCore(basename, (n) => names.indexOf(n) >= 0)
        }

        public mkField(basename:string, k:Kind)
        {
            var n = this.mkUniqName(basename);
            var r = new RecordField(n, k, this.isKeyBlock());
            return r;
        }

        public emptyStmt()
        {
            var basename = "f"
            var k = api.core.String
            if (this.isKeyBlock()) {
                if (this.parentDef.recordType == RecordType.Table) {
                    var kinds = Script.getKinds().filter((k: Kind) =>
                        (k != this.parentDef.entryKind &&
                        k.isData && k.hasContext(KindContext.RowKey)) &&
                        (!this.parentDef.locallypersisted() || (<RecordEntryKind>k).getRecord().locallypersisted()) &&
                        (!this.parentDef.cloudEnabled || (<RecordEntryKind>k).getRecord().cloudEnabled));
                    if (kinds.length == 0) return null;
                    k = kinds[0];
                    basename = "l"
                } else {
                    basename = "k"
                }
            }
            return this.mkField(basename, k);
        }

        public accept(v:NodeVisitor) { return v.visitFieldBlock(this); }
        public parentDef:RecordDef;
        public notifyChange()
        {
            super.notifyChange();
            this.parentDef.notifyChange();
        }
        public fields():RecordField[] { return <RecordField[]>this.stmts; }
        public canBeOffloaded() { return false; }
        public nodeType() { return "fieldBlock"; }
    }

    export class InlineActionBlock
        extends Block
    {
        constructor() {
            super()
            this.stmts = [];
        }
        public allowAdding() { return !!(<InlineActions>this.parent).getOptionsParameter() }
        public allowEmpty() { return true; }
        public emptyStmt() { return OptionalParameter.mk(""); }
        public accept(v:NodeVisitor) { return v.visitInlineActionBlock(this); }
        public push(s:Stmt) { this.stmts.push(s); s.parent = this; }
        public nodeType() { return "inlineActionBlock"; }
        public allowAddOf(n:Stmt) { return n instanceof InlineAction }
    }

    export class For
        extends Stmt
    {
        public boundLocal:LocalDef;
        public upperBound:ExprHolder;
        public body:CodeBlock;
        constructor() {
            super()
        }
        public nodeType() { return "for"; }
        public calcNode() { return this.upperBound; }
        public children() { return [<AstNode> this.upperBound, this.body]; }
        public primaryBody() { return this.body; }
        public accept(v:NodeVisitor) { return v.visitFor(this); }
        public isExecutableStmt() { return true; }
        public allowSimplify() { return true }
        public loopVariable():LocalDef { return this.boundLocal }

        public writeTo(tw:TokenWriter)
        {
            this.writeIdOpt(tw);
            tw.keyword("for").op("0").op("\u2264").id(this.boundLocal.getName()).op("<");
            tw.node(this.upperBound).keyword("do").node(this.body);
        }

        private parseFrom(p:Parser)
        {
            this.setStableName(p.consumeLabel());
            p.skipOp("0");
            p.skipOp("\u2264");
            this.boundLocal = mkLocal(p.parseId("i"), api.core.Number);
            p.skipOp("<");
            this.upperBound = p.parseExpr();
            p.skipKw("do");
            this.body = p.parseBlock();
            this.body.parent = this;
        }

        public forSearch() { return "for do " + this.upperBound.forSearch(); }
    }

    export class Foreach
        extends Stmt
    {
        public boundLocal:LocalDef;
        public collection:ExprHolder;
        // the block contains Where stmts only (at the moment; in future there might be OrderBy etc)
        public conditions:ConditionBlock;
        public body:CodeBlock;
        constructor() {
            super()
        }
        public nodeType() { return "foreach"; }
        public calcNode() { return this.collection; }
        public primaryBody() { return this.body; }
        public accept(v:NodeVisitor) { return v.visitForeach(this); }
        public children() { return [<AstNode> this.collection, this.conditions, this.body]; }
        public isExecutableStmt() { return true; }
        public allowSimplify() { return true }
        public loopVariable():LocalDef { return this.boundLocal }

        public writeTo(tw:TokenWriter)
        {
            this.writeIdOpt(tw);
            tw.keyword("foreach").id(this.boundLocal.getName()).keyword("in").node(this.collection).nl();
            this.conditions.stmts.forEach((c:Stmt) => { c.writeTo(tw) });
            tw.keyword("do").node(this.body);
        }

        private parseFrom(p:Parser)
        {
            this.setStableName(p.consumeLabel());
            this.boundLocal = mkLocal(p.parseId("e"), api.core.Unknown);
            p.skipKw("in");
            this.collection = p.parseExpr();
            var conds:Stmt[] = []
            p.shiftLabel();
            while (p.gotKw("where")) {
                p.shift();
                var wh = mkWhere(p.parseExpr());
                wh.setStableName(p.consumeLabel());
                conds.push(wh);
                p.shiftLabel();
            }
            if (conds.every(s => s instanceof Where && (<Where>s).condition.getLiteral() === true))
                conds = []
            this.conditions = new ConditionBlock();
            this.conditions.setChildren(conds);
            this.conditions.parent = this;
            p.skipKw("do");
            this.body = p.parseBlock();
            this.body.parent = this;
        }

        public forSearch() { return "foreach for each in do " + this.collection.forSearch(); }
    }

    export class While
        extends Stmt
    {
        public condition:ExprHolder;
        public body:CodeBlock;
        constructor() {
            super()
        }
        public nodeType() { return "while"; }
        public calcNode() { return this.condition; }
        public primaryBody() { return this.body; }
        public accept(v:NodeVisitor) { return v.visitWhile(this); }
        public children() { return [<AstNode> this.condition, this.body]; }
        public isExecutableStmt() { return true; }

        public writeTo(tw:TokenWriter)
        {
            this.writeIdOpt(tw);
            tw.keyword("while").node(this.condition);
            tw.keyword("do").node(this.body);
        }

        private parseFrom(p:Parser)
        {
            this.setStableName(p.consumeLabel());
            this.condition = p.parseExpr();
            p.skipKw("do");
            this.body = p.parseBlock();
            this.body.parent = this;
        }

        public forSearch() { return "while do " + this.condition.forSearch(); }
    }

    export interface IfBranch
    {
        condition: ExprHolder;
        body: CodeBlock;
    }

    export class If
        extends Stmt
    {
        public rawCondition:ExprHolder;
        public rawThenBody:CodeBlock;
        public rawElseBody:CodeBlock;
        // this is filled out by every type check when not isElseIf
        // the last branch has condition==null - it's the final else branch
        public branches: IfBranch[];
        public parentIf: If;

        public isElseIf:boolean;
        public displayElse:boolean = true;
        public allowSimplify() { return !this.isElseIf }

        public nodeType() { return this.isElseIf ? "elseIf" : "if"; }
        public accept(v:NodeVisitor) { return this.isElseIf ? v.visitElseIf(this) : v.visitIf(this); }
        constructor() {
            super()
        }
        public calcNode() { return this.rawCondition; }
        public children() { return [<AstNode> this.rawCondition, this.rawThenBody, this.rawElseBody]; }

        public setElse(s:CodeBlock)
        {
            this.rawElseBody = s;
            s.parent = this;
        }

        public isTopCommentedOut()
        {
            return !this.isElseIf && this.rawElseBody.isBlockPlaceholder() && this.rawCondition.getLiteral() === false
        }

        public primaryBody() { return this.rawThenBody; }
        public isExecutableStmt() { return true; }

        public writeTo(tw:TokenWriter)
        {
            if (this.isElseIf)
                tw.keyword("else")
            this.writeCore(tw)
            if (!this.rawElseBody.isBlockPlaceholder())
                tw.keyword("else").node(this.rawElseBody);
        }

        public writeCore(tw:TokenWriter)
        {
            this.writeIdOpt(tw);
            tw.keyword("if").node(this.rawCondition).keyword("then").node(this.rawThenBody);
        }

        public parseFrom(p:Parser)
        {
            this.setStableName(p.consumeLabel());
            this.rawCondition = p.parseExpr();
            p.skipKw("then");
            this.rawThenBody = p.parseBlock();
            this.rawThenBody.parent = this;
            this.setElse(Parser.emptyBlock())
        }

        public forSearch() { return "if then " + this.rawCondition.forSearch(); }

        public bodies():CodeBlock[]
        {
            if (this.isElseIf) return []
            return this.branches.map(b => b.body)
        }
    }

    export function isElseIf(s:Stmt) {
        return s instanceof If && (<If>s).isElseIf;
    }

    export class Box
        extends Stmt
    {
        public body:CodeBlock;
        constructor() {
            super()
        }
        private emptyExpr = Parser.emptyExpr();
        public nodeType() { return "boxed"; }
        public calcNode() { return this.emptyExpr; }
        public primaryBody() { return this.body; }
        public accept(v:NodeVisitor) { return v.visitBox(this); }
        public children() { return [<AstNode>this.body]; }
        public isExecutableStmt() { return true; }

        public writeTo(tw:TokenWriter)
        {
            this.writeIdOpt(tw);
            tw.keyword("do").id("box").node(this.body);
        }

        private parseFrom(p:Parser)
        {
            this.setStableName(p.consumeLabel());
            this.body = p.parseBlock();
            this.body.parent = this;
        }

        public forSearch() { return "boxed"; }
    }


    export class ExprStmt
        extends Stmt
    {
        public expr:ExprHolder;
        constructor() {
            super()
        }
        public isVarDef() {
            return this.expr.looksLikeVarDef ||
                (!!this.expr.assignmentInfo() && this.expr.assignmentInfo().definedVars.length > 0);
        }
        public isPagePush() { return !!this.expr.assignmentInfo() && this.expr.assignmentInfo().isPagePush; }
        public nodeType() { return "exprStmt"; }
        public calcNode() { return this.expr; }
        public isPlaceholder() { return this.expr.isPlaceholder(); }
        public accept(v:NodeVisitor) { return v.visitExprStmt(this); }
        public isExecutableStmt() { return true; }

        public allowSimplify() { return true }

        public helpTopic() { return this.isVarDef() ? "var" : "commands"; }

        public writeTo(tw:TokenWriter)
        {
            this.writeIdOpt(tw);
            if (this.isPlaceholder()) tw.keyword("skip");
            else tw.node(this.expr);
            tw.op0(";").nl();
        }

        public forSearch() { return (this.isVarDef() ? "var " : "") + this.expr.forSearch(); }
    }

    export class InlineActionBase
        extends Stmt
    {
        public recordField:RecordField;
        public _sort_key:number;
        public getName() { return "" }
    }

    export class OptionalParameter
        extends InlineActionBase
    {
        public _opt_name:string;
        public expr:ExprHolder;

        public getName()
        {
            return this.recordField ? this.recordField.getName() : this._opt_name;
        }

        constructor() {
            super()
        }

        static mk(name:string)
        {
            var opt = new AST.OptionalParameter()
            opt.expr = AST.Parser.emptyExpr()
            opt._opt_name = name
            return opt
        }

        public nodeType() { return "optionalParameter"; }
        public calcNode() { return this.expr; }
        public accept(v:NodeVisitor) { return v.visitOptionalParameter(this); }
        public children() { return [<AstNode> this.expr]; }

        public writeTo(tw:TokenWriter)
        {
            this.writeIdOpt(tw);
            tw.keyword("where").id(this.getName()).op(":=").node(this.expr).op0(";").nl();
        }

        public parseFrom(p:Parser)
        {
            this.setStableName(p.consumeLabel());
            this._opt_name = p.parseId()
            p.skipOp(":=")
            this.expr = p.parseExpr();
            p.skipOp(";")
        }

        public forSearch() { return "with " + this.getName() + " := " + this.expr.forSearch(); }

        static optionsParameter(prop:IProperty) : PropertyParameter
        {
            if (!prop) return null
            var last = prop.getParameters().peek()
            if (!last) return null
            if (!/\?$/.test(last.getName())) return null
            var lk = last.getKind()
            if (!lk.isUserDefined()) return null
            var rec = lk.getRecord()
            if (rec && rec.tableKind.getProperty("create"))
                return last
            return null
        }
    }

    export class InlineAction
        extends InlineActionBase
    {
        public name:LocalDef;
        public inParameters:LocalDef[] = [];
        public outParameters:LocalDef[] = [];
        public body:CodeBlock;

        public isImplicit:boolean;
        public isOptional:boolean;

        public children() { return [<AstNode> this.body] }
        public nodeType() { return "inlineAction"; }
        public helpTopic() { return "inlineActions"; }
        public getName() { return this.recordField ? this.recordField.getName() : this.name.getName() }

        constructor() { super() }

        static mk(name:LocalDef)
        {
            var inl = new InlineAction();
            inl.name = name;
            inl.body = new CodeBlock();
            inl.body.parent = inl;
            inl.body.setChildren([inl.body.emptyStmt()]);
            return inl;
        }

        public writeTo(tw:TokenWriter)
        {
            this.writeIdOpt(tw);
            var writeParms = (parms:LocalDef[]) =>
            {
                var first = true;
                parms.forEach((l) => {
                    if (!first) tw.op0(",").space();
                    l.writeWithType(this.parentApp(), tw);
                    first = false;
                });
            }
            tw.keyword("where");
            if (this.isImplicit)
                tw.op("implicit")
            if (this.isOptional)
                tw.op("optional")
            tw.id(this.name.getName()).op0("(");
            writeParms(this.inParameters);
            tw.op0(")");
            if (this.outParameters.length > 0) {
                tw.space().keyword("returns").space().op0("(");
                writeParms(this.outParameters);
                tw.op0(")");
            }
            this.body.writeTo(tw);
        }

        public parseFrom(p:Parser)
        {
            this.setStableName(p.consumeLabel());
            if (p.gotOp("implicit")) {
                this.isImplicit = true
                p.shift()
            }
            if (p.gotOp("optional")) {
                this.isOptional = true
                p.shift()
            }
            var hd = p.parseActionHeader();
            this.name = mkLocal(hd.name, api.core.Unknown);
            this.inParameters = hd.inParameters.map((p) => p.local);
            this.outParameters = hd.outParameters.map((p) => p.local);

            this.body = p.parseBlock();
            this.body.parent = this;
        }

        public forSearch() { return "where " + this.name.getName(); } // TODO add parameters?
        public accept(v:NodeVisitor) { return v.visitInlineAction(this); }
        // public isExecutableStmt() { return true; } ??
    }

    export class InlineActions
        extends ExprStmt
    {
        public actions:InlineActionBlock = new InlineActionBlock();
        constructor() {
            super()
            this.actions = new InlineActionBlock();
            this.actions.parent = this;
        }
        public nodeType() { return "inlineActions"; }
        public isPlaceholder() { return false; }
        public accept(v:NodeVisitor) { return v.visitInlineActions(this); }
        public children() { return [<AstNode> this.expr, this.actions]; }

        public getOptionsParameter():PropertyParameter
        {
            var topCall = this.calcNode().topCall()
            if (!topCall) return null

            var optionsParm = AST.OptionalParameter.optionsParameter(topCall.getCalledProperty())
            return optionsParm
        }

        public optionalParameters():InlineActionBase[]
        {
            return (<InlineActionBase[]>this.actions.stmts).filter(s => {
                if (s instanceof InlineAction)
                    return (<InlineAction>s).isOptional
                else if (s instanceof OptionalParameter)
                    return true
                else
                    Util.oops("bad element " + s.nodeType())
            })
        }

        public normalActions():InlineAction[]
        {
            return <InlineAction[]>this.actions.stmts.filter(s => s instanceof InlineAction && !(<InlineAction>s).isOptional)
        }

        public implicitAction():InlineAction
        {
            var last = this.actions.stmts.peek()
            if (last instanceof InlineAction) {
                var i = <InlineAction>last
                return i.isImplicit ? i : null
            }

            return null
        }

        static isImplicitActionKind(k:Kind)
        {
            if (k instanceof ActionKind) {
                var ak = <ActionKind>k
                return ak.getInParameters().length == 0 && ak.getOutParameters().length == 0
            }
            return false
        }

        public writeTo(tw:TokenWriter)
        {
            super.writeTo(tw);
            this.actions.forEach((a) => a.writeTo(tw));
        }

        public sortOptionals()
        {
            var opt0 = this.optionalParameters()[0]
            if (!opt0 || !opt0.recordField) return
            var lst = opt0.recordField.def().values.stmts
            var problem = false
            this.actions.forEach((iab:InlineActionBase) => {
                if (iab.recordField) {
                    iab._sort_key = lst.indexOf(iab.recordField)
                    if (iab._sort_key < 0) problem = true
                } else if (iab instanceof InlineAction) {
                    iab._sort_key = (<InlineAction>iab).isImplicit ? 1.1e10 : 1e10;
                } else {
                    problem = true
                }
            })

            if (problem) return

            this.actions.stmts.sort((a:InlineActionBase, b:InlineActionBase) => a._sort_key - b._sort_key)
            this.actions.notifyChange()
        }

        static implicitActionParameter(prop:IProperty) : PropertyParameter
        {
            if (!prop) return null
            var parms = prop.getParameters()
            if (OptionalParameter.optionsParameter(prop)) parms.pop()
            var last = parms.peek()
            if (!last) return null
            if (last.getName() == "body" && InlineActions.isImplicitActionKind(last.getKind()))
                return last
            return null
        }
    }

    export class ForeachClause
        extends Stmt
    {
        constructor() {
            super()
        }
    }

    export class Where
        extends ForeachClause
    {
        public condition:ExprHolder;
        constructor() {
            super()
        }
        public nodeType() { return "where"; }
        public calcNode() { return this.condition; }
        public accept(v:NodeVisitor) { return v.visitWhere(this); }
        public isPlaceholder()
        {
            return this.condition.isPlaceholder() ||
            (this.condition.tokens.length == 1 && this.condition.tokens[0].getText() == "true");
        }

        public writeTo(tw:TokenWriter)
        {
            this.writeIdOpt(tw);
            tw.keyword("where").node(this.condition).nl();
        }

        public forSearch() { return "where " + this.condition.forSearch(); }
    }

    // pseudo-statements - they can be selected just like statements in the code editor

    export class ActionParameter
        extends Stmt
    {
        // We're using the same tricks as for the [RecordField] to turn this
        // into an editable statement.
        private exprHolder = new AST.ExprHolder();

        constructor(public local:LocalDef) {
            super();

            this.setupForEdit()
        }

        public setupForEdit() { 
            var name = new FieldName();
            name.data = this.getName();
            this.exprHolder.tokens = [ <AST.Token> name ].concat(propertyRefsForKind(this.local.getKind()));
            this.exprHolder.parsed = new AST.Literal(); // placeholder
            this.exprHolder.locals = [];
        }

        public calcNode() {
            return this.exprHolder;
        }

        public notifyChange() {
            // See [RecordField] for comments. In essence, we're reflecting the
            // changes performed via the editor onto our [LocalDef]. Further
            // calls to [getName] and [getKind] will fetch the value from the
            // [LocalDef].
            var toks = this.exprHolder.tokens;

            if (toks.length == 0 && this.parent) {
                var pb = <ParameterBlock> this.parent;
                var ch = pb.children().filter(x => x != this);
                pb.setChildren(ch);
            } else if (toks[0] && toks[0] instanceof FieldName) {
                // Propagate the new name, if any.
                var newName = (<FieldName>toks[0]).data;
                if (this.getName() != newName) {
                    var uniqName = this.parentAction().nameLocal(newName);
                    this.local.rename(uniqName);
                    (<AST.FieldName> toks[0]).data = uniqName;
                }

                // Propagate the kind, if any.
                if (toks.length > 1) {
                    var k = this.exprHolder.getKind();
                    if (isProperKind(k) && k != this.local.getKind()) {
                        this.local.setKind(k);
                        TypeChecker.tcApp(Script);
                    }
                }
            }

            if (toks.length > 1 && toks[1] instanceof AST.PropertyRef)
                (<AST.PropertyRef>toks[1]).skipArrow = true;

            super.notifyChange();
        }

        public getName() { return this.local.getName(); }
        public getKind() { return this.local.getKind(); }
        public nodeType() { return "actionParameter"; }
        public accept(v:NodeVisitor) { return v.visitActionParameter(this); }

        public theAction() { return (<AST.ActionHeader>this.parent.parent).action; }

        public forSearch() { return this.getName() + " " + this.getKind().toString(); }
        public writeTo(tw:TokenWriter)
        {
            tw.keyword("var");
            this.local.writeWithType(this.parentApp(), tw);
            tw.op0(";").nl();
        }

        public matches(d:AstNode)
        {
            return this.getKind() && this.getKind().matches(d)
        }
    }

    export class ActionHeader
        extends Stmt
    {
        public inParameters:ParameterBlock = new ParameterBlock();
        public outParameters:ParameterBlock = new ParameterBlock();

        constructor(public action:Action) {
            super()
            this.inParameters.parent = this;
            this.outParameters.parent = this;
        }

        public getName() { return this.action.getName(); }
        public nodeType() { return "actionHeader"; }
        public children() {
            return [<AST.Stmt>this.inParameters, this.outParameters, this.action.body];
        }
        public primaryBody() { return this.action.body; }
        public accept(v:NodeVisitor) { return v.visitActionHeader(this); }

        public writeTo(tw:TokenWriter)
        {
            this.action.writeHeader(tw)
        }

        public notifyChange()
        {
            super.notifyChange();
            this.action.notifyChange();
        }

        public canBeOffloaded(): boolean { return false; }
    }


    export interface ProfilingAstNodeData {
        count: number;  // number of node executions
        duration: number;  // total duration of node executions
    }

    export interface DebuggingAstNodeInfo {
        alwaysTrue?: boolean;
        alwaysFalse?: boolean;
        visited?: boolean;
        critical?: number;
        max?: { critical: number };
        errorMessage?: string;
        // other stuff may go here
    }

    // -------------------------------------------------------------------------------------------------------
    // Declarations
    // -------------------------------------------------------------------------------------------------------

    export class Decl
        extends Stmt
    {

        public _wasTypechecked = false;
        public deleted:boolean;
        public parent:App;
        public wasAutoNamed = false;
        public visitorState:any;
        public diffStatus:number;
        public diffAltDecl:Decl;
        constructor() {
            super()
        }

        public getCoreName() { return this.getName(); }
        public getIconArtId(): string { return null; }
        public hasErrors() { return !!this.getError(); }
        public hasWarnings() { return false }
        public getDescription(skip?:boolean) { return ""; }
        public isBrowsable() { return true; }
        public propertyForSearch():IProperty { return null; }
        public toString() { return this.getName(); }
        public helpTopic(): string { return null; }
        public usageKey():string { return null; }
        public freshlyCreated() { }
        public getDefinedKind():Kind { return null }

        public matches(d:AstNode)
        {
            if (this.getKind() && this.getKind().matches(d))
                return true
            return this == d
        }

        public cachedSerialized:IndexedString;

        public canRename() { return true; }

        public notifyChange()
        {
            super.notifyChange();
            if (this.cachedSerialized) {
                var idx = this.cachedSerialized.idx;
                if (idx > 0)
                    this.cachedSerialized.idx = -idx;
            }
        }
        public nodeType() { return "decl"; }
        public accept(v:NodeVisitor) { return v.visitDecl(this); }

        public canBeOffloaded(): boolean { return false; }
    }

    export class PropertyDecl
        extends Decl
    {
        constructor() {
            super()
            this._usage = new TokenUsage(this);
        }
        public getSignature():string { return Property.getSignatureCore(<any>this); }

        public canCacheSearch() { return false; }
        public thingSetKindName() { return null; }

        public getInfixPriority() { return 0; }
        public forwardsTo() { return this; }
        public forwardsToStmt():Stmt { return null; }
        public propertyForSearch():IProperty { return <IProperty> (<any> this); }
        public parentKind:Kind;
        public getCapability() { return PlatformCapability.None }
        public getExplicitCapability() { return this.getCapability() }
        public isBeta() { return false }
        public showIntelliButton() { return true }
        public getImports() : IImport[] { return undefined; }

        public shouldPauseInterperter() { return false; }
        public isImplemented() { return true; }
        public isImplementedAnywhere() { return this.isImplemented() }
        public isSupported() { return true; }
        public getSpecialApply():string { return null; }
        public isBrowsable() { return true; }
        private _usage:TokenUsage;
        public getUsage() { return this._usage; }
        public lastMatchScore:number;
        public useFullName:boolean;
        public helpTopic() { return this.nodeType(); }

        public getFlags() { return PropertyFlags.None }

        public getArrow()
        {
            return "\u200A";
        }

        public runtimeName()
        {
            return Api.runtimeName(this.getName())
        }

        // tracing
        public needsSpecialTracing() { return false; }
        public needsTracing() { return false; }
        public needsTimestamping() { return false; }
        public hasPauseContinue() { return false; }

        static mkPPext(s:IProperty, name:string, k:Kind)
        {
            var pp = new PropertyParameter(name, k);
            pp.parentProperty = s;
            return pp;
        }

        public mkPP(name:string, k:Kind) { return PropertyDecl.mkPPext(<any>this, name, k); }

        public getParameters():PropertyParameter[] { return [this.mkPP("_this_", this.parentKind)]; }
        public getResult():PropertyParameter { return this.mkPP(this.getName(), this.getKind()); }

        public getNamespace()
        {
            var pkn = this.thingSetKindName()
            if (!pkn) return null
            var k = api.getKind(pkn)
            if (!k) return null
            return k.shortName() + "\u200A";
        }

        public setName(s:string)
        {
            super.setName(s);
            if (this.parent) {
                this.parent.notifyChangeAll();
            }
        }

        /*
        getCategory():PropertyCategory;
        */
    }

    export class GlobalDef
        extends PropertyDecl
        implements IProperty
    {
        public readonly:boolean = false;
        public comment:string = "";
        public url:string = "";
        public isResource:boolean = false;
        public isTransient: boolean = true;
        public cloudEnabled: boolean = false;

        public debuggingData: { critical: number; max: { critical: number }; };
        public usageLevel:number;

        constructor() {
            super()
        }
        public children() : AstNode[] { return []; }
        public nodeType() { return "globalDef"; }
        public helpTopic() { return this.thingSetKindName() }
        public accept(v:NodeVisitor) { return v.visitGlobalDef(this); }
        public getDescription()
        {
            if (this.isResource && this.getKind() == api.core.Color)
                return lf("color #{0}", this.url);
            return lf("a global variable")
        }
        public forSearch()
        {
            var decoded = this.url || ""
            if (this.isResource && this.getKind() == api.core.String && this.url) {
                var tmp = RT.String_.valueFromArtUrl(this.url)
                if (tmp) decoded = tmp
            }
            return decoded
        }
        public thingSetKindName() { return this.isResource ? "art" : "data"; }

        public getCategory() { return PropertyCategory.Data; }

        public setKind(k:Kind)
        {
            this._kind = k;
            //if (!k.isSerializable)
            //    this.isTransient = true;
        }

        public writeTo(tw:TokenWriter)
        {
            this.writeId(tw);
            tw.nl().keyword("var").id(this.getName()).op(":").kind(this.parent, this.getKind());
            tw.beginBlock();
                if (!!this.comment)
                    tw.comment(this.comment);
                if (this.isResource) {
                    tw.boolOptAttr("is_resource", this.isResource);
                    if (!!this.url) tw.stringAttr("url", this.url);
                } else
                    tw.boolOptAttr("readonly", this.readonly);
                tw.boolOptAttr("transient", this.isTransient);
                tw.boolOptAttr("cloudenabled", this.cloudEnabled);
            tw.endBlock();
        }

        static parse(p:Parser)
        {
            var v = new GlobalDef();
            v.setStableName(p.consumeLabel());
            v.isTransient = false;
            p.addDecl(v);

            v.setName(p.parseId());
            v.setKind(p.parseTypeAnnotation());

            p.parseBraced(() => {
                if (p.gotKey("readonly")) v.readonly = p.parseBool();
                if (p.gotKey("transient")) v.isTransient = p.parseBool();
                if (p.gotKey("cloudenabled")) v.cloudEnabled = p.parseBool();
                if (p.gotKey("is_resource")) {
                    v.isResource = p.parseBool();
                    if (v.isResource) v.readonly = true;
                }
                if (p.gotKey("url")) v.url = p.parseString();
                if (p.got(TokenType.Comment)) v.comment += p.shift().data + "\n";
            });

            if (v.cloudEnabled) v.isTransient = false;
        }

        public getRecordPersistence()
        {
            if (this.cloudEnabled) return RecordPersistence.Cloud;
            if (!this.isTransient) return RecordPersistence.Local;
            return RecordPersistence.Temporary;
        }

        public canBeOffloaded() { return true; }

        public notifyChange() {
            super.notifyChange();

            // we are editing data structure definitions! Must ensure to remove all stale state.
            if (Runtime.theRuntime)
                Runtime.theRuntime.resetData();
        }
    }

    export class SingletonDef
        extends Decl
    {
        public _isBrowsable = true;
        constructor() {
            super()
            this.usage = new TokenUsage(this);
        }
        public usage:TokenUsage;
        public getUsage() { return this.usage; }
        public nodeType() { return "singletonDef"; }
        public accept(v:NodeVisitor) { return v.visitSingletonDef(this); }
        public getDescription(skip?:boolean) { return this.getKind().getHelp(!skip); }
        public isBrowsable() { return this._isBrowsable; }
        public usageMult() { return 1; }
        public canBeOffloaded() { return this.getName() !== "art"; }
        public usageKey() {
            return Util.tagify(this.getKind().getName());
        }
    }

    export class PlaceholderDef
        extends Decl
    {
        constructor() {
            super()
        }
        public nodeType() { return "placeholderDef"; }
        public getDescription() { return "need " + this.getKind().toString() + " here"; }
        public isBrowsable() { return false; }

        public escapeDef:any;

        public getName() { return "need " + this.getKind().serialize() + (this.label ? ":" + this.label : ""); }
        public label:string;
        public longError()
        {
            return lf("TD100: insert {0:a} here", this.label || this.getKind().toString())
        }
    }

    export class Action
        extends PropertyDecl
        implements IProperty
    {
        constructor() {
            super()
            this.header = new ActionHeader(this);
        }
        public nodeType() { return "action"; }
        public header:ActionHeader;
        public _isTest:boolean;
        public isTest():boolean { return this._isTest && (this.isCompilerTest() || !this.hasInParameters()) }
        public isNormalAction() { return !this.isPage() && !this.isEvent() && !this.isLambda }
        public isEvent() { return !!this.eventInfo; }
        public isPage() { return this._isPage; }
        public isPrivate: boolean;
        public isQuery: boolean;
        public isOffline: boolean;
        public isLambda:boolean;
        public numUnsupported = 0;
        private isShareTarget:boolean;
        private definedKind:UserActionKind;
        public body:CodeBlock;
        public _hasErrors:boolean;
        public _errorsOK:boolean;
        public _isPage:boolean;
        public _isActionTypeDef:boolean;
        public compilerParentAction:Action; // this is only set for synthetic actions created in compiler for lambda expressions
        public _skipIntelliProfile:boolean;
        public allLocals:LocalDef[];
        public accept(v:NodeVisitor) { return v.visitAction(this); }
        public children() { return [this.header]; }
        public hasErrors() { return this._hasErrors; }
        public isMainAction() { return this.parent && this.parent.mainAction() == this; }
        public eventInfo:EventInfo;
        public parentLibrary():LibraryRef { return this.parent && this.parent.isTopLevel && this.parent.thisLibRef; }
        public thingSetKindName() { return this.isEvent() ? null : "code"; }
        public isActionTypeDef() { return this._isActionTypeDef; }

        public isExtensionAction() { return false }
        public extensionForward():Action { return this }
        public hasWarnings() { return this.numUnsupported > 0 }

        public getExtensionKind():Kind
        {
            var p = this.getInParameters()
            if (p.length >= 1 && !/\?$/.test(p[0].getName()) &&
                p[0].getKind().isExtensionEnabled())
                return p[0].getKind()
            return null
        }

        public getFlags()
        {
            var flags = !this.isAtomic ? PropertyFlags.Async : PropertyFlags.None

            if (this.body)
                for (var i = 0; i < this.body.stmts.length; ++i) {
                    var s = this.body.stmts[i]
                    if (s instanceof Comment) {
                        var t = (<Comment>s).text
                        if (/{action:ignoreReturn}/i.test(t)) {
                            flags |= PropertyFlags.IgnoreReturnValue
                        }
                    } else {
                        break;
                    }
                }

            return flags
        }

        public clearError()
        {
            super.clearError();
            this.numUnsupported = 0
        }

        public isInLibrary() { return false }
        public markUsed() { }

        public modelParameter:ActionParameter;

        public helpTopic() {
            return this.isActionTypeDef() ? "action types" :
                   this.isPage() ? "pages" :
                   this.isEvent() ? "events" :
                   "code";
        }

        // flag to indicate whether to offload the action.
        // When Util.cloudRun is set, the editor allows to select a sequence of stmts,
        // extracts them to a new action, and set the offload flag of the new action to true.
        public isOffloaded: boolean;
        public isAtomic: boolean = false;
        public canBeInlined: boolean = false;

        public debuggingData: { critical: number; max: { critical: number }; };

        public isCompilerTest()
        {
            return this._isTest && /^E: /.test(this.getName())
        }

        public getModelDef()
        {
            if (!this.modelParameter) return null
            if (this.modelParameter.getKind() instanceof RecordEntryKind) {
                return (<RecordEntryKind>this.modelParameter.getKind()).getRecord()
            }
            return null
        }

        public getInlineHelp():string
        {
            if (this.eventInfo) return this.eventInfo.type.help;
            if (!this.body) return "";
            var desc = ""
            for (var i = 0; i < this.body.stmts.length; ++i) {
                var s = this.body.stmts[i]
                if (s instanceof Comment) {
                    var c = <Comment>s;
                    if (desc) desc += "\n";
                    desc += c.text;
                } else {
                    break;
                }
            }
            return desc;
        }

        public getDescription():string
        {
            var desc = this.getInlineHelp();
            if (desc) return desc;
            return this.isActionTypeDef() ? lf("an action type definition")
                 : this.isEvent() ? lf("an event handler")
                 : this.isPage() ? lf("a page") : lf("an action")
        }

        // IProperty
        public getCategory():PropertyCategory { return PropertyCategory.Action; }
        public getParameters() : PropertyParameter[]
        {
            return super.getParameters().concat(
                this.getInParameters().map((p:ActionParameter) => this.mkPP(p.getName(), p.getKind())));
        }
        public getResult() : PropertyParameter
        {
            var op = this.getOutParameters();
            if (op.length == 1)
                return this.mkPP(op[0].getName(), op[0].getKind());
            else
                return this.mkPP("result", api.core.Nothing);
        }

        public getDefinedKind()
        {
            if (!this.isActionTypeDef()) return null
            if (!this.definedKind) this.definedKind = new UserActionKind(this)
            return this.definedKind
        }

        public setEventInfo(ei:EventInfo)
        {
            this.eventInfo = ei;
            this.isAtomic = false;
            if (!!ei) {
                this.header.inParameters.immutableReason = "Types, order, and number of event parameters cannot be edited.";
                this.header.outParameters.immutableReason = "Events cannot have out parameters.";
            }
        }

        public getPageBlock(init:boolean) : CodeBlock
        {
            var ch = this.body.children();
            if (ch.length != 2 || !(ch[0] instanceof If) || !(ch[1] instanceof If))
                return null;
            var ifInit = <If>ch[0];
            var renderIf = <If>ch[1];
            var ifToks = ifInit.rawCondition.tokens;

            if (!ifInit.rawElseBody.isBlockPlaceholder()) return null;
            if (!renderIf.rawElseBody.isBlockPlaceholder()) return null;
            if (ifToks.length != 2 || !(ifToks[0] instanceof ThingRef) || !(ifToks[1] instanceof PropertyRef))
                return null;
            if ((<ThingRef>ifToks[0]).data != "box" || (<PropertyRef>ifToks[1]).data != "is init")
                return null;

            this.body.isInvisible = true;

            function markInvisible(i:If) {
                i.isInvisible = true;
                i.rawElseBody.isInvisible = true;
                var s0 = i.rawElseBody.stmts[0]
                if (s0) s0.isInvisible = true;
            }
            markInvisible(ifInit);
            markInvisible(renderIf);

            return init ? ifInit.rawThenBody : renderIf.rawThenBody;
        }

        public getInParameters():ActionParameter[] { return <ActionParameter[]>this.header.inParameters.stmts; }
        public getOutParameters():ActionParameter[] { return <ActionParameter[]>this.header.outParameters.stmts; }
        public getAllParameters():ActionParameter[] { return this.getInParameters().concat(this.getOutParameters()); }
        public hasInParameters() { return this.getInParameters().length > 0; }
        public hasOutParameters() { return this.getOutParameters().length > 0; }

        public nameLocal(n:string, usedNames:any = {})
        {
            return AstNode.freshNameCore(n,
                (n:string) =>
                    usedNames.hasOwnProperty(n) ||
                    this.allLocals.some((l:LocalDef) => l.getName() == n) ||
                    api.getThing(n) != null);
        }

        public isPlugin()
        {
            if (this.getName() != "plugin")
                return false
            var parms = this.getInParameters()
            if (parms.length != 1)
                return false
            if (parms[0].getKind() == api.core.String ||
                parms[0].getKind() == api.core.Editor)
                return true

            return false
        }

        public isButtonPlugin()
        {
            if (this.isPrivate) return false

            var parms = this.getInParameters()
            if (parms.length != 1) return false

            // the type may be unresolved
            return parms[0].getKind().getName() == "Editor"
        }


        public isRunnable()
        {
            return !this.isActionTypeDef() && !this.isEvent() && !this.isPrivate && (this.isPlugin() || this.isButtonPlugin() || !this.hasInParameters() ||
                (!this.isPage() && this.getInParameters().every((a) => !!a.getKind().picker)));
        }

        public writeHeader(tw:TokenWriter, forLibSig = false)
        {
            var writeParms = (parms:ActionParameter[]) =>
            {
                var first = true;
                parms.forEach((l:ActionParameter) => {
                    if (!first)
                        tw.op0(",").space();
                    if (!forLibSig)
                        l.writeIdOpt(tw);
                    l.local.writeWithType(this.parent, tw);
                    first = false;
                });
            }

            tw.nl().keyword(this.isEvent() ? "event" : "action");
            if (forLibSig) {
                tw.op(!this.isAtomic ? "async" : "sync");
            }
            //if (forLibSig && this.isPage()) tw.op("page")
            if (this.isActionTypeDef())
                tw.op("type")
            tw.id(this.getName()).op0("(");
            var parms = this.getInParameters();
            if (this.modelParameter) {
                parms = parms.slice(0);
                parms.unshift(this.modelParameter);
            }
            writeParms(parms);
            tw.op0(")");

            if (this.hasOutParameters()) {
                tw.keyword("returns").op0("(");
                writeParms(this.getOutParameters());
                tw.op0(")");
            }
        }

        public writeTo(tw:TokenWriter)
        {
            this.writeId(tw);
            this.writeHeader(tw);

            if (tw.skipActionBodies) {
                tw.beginBlock();
                tw.endBlock();
            } else {
                this.body.writeTo(tw);
            }

            tw.backspaceBlockEnd();
            if (this.isPrivate)
                tw.keyword("meta").keyword("private").op0(";").nl();
            if (this.isPage())
                tw.keyword("meta").keyword("page").op0(";").nl();
            if (this.isAtomic && !this.isEvent())
                tw.keyword("meta").keyword("sync").op0(";").nl();
            if (this.isTest())
                tw.keyword("meta").keyword("test").op0(";").nl();
            if (this.isOffline)
                tw.keyword("meta").keyword("offline").op0(";").nl();
            if (this.isQuery)
                tw.keyword("meta").keyword("query").op0(";").nl();

            tw.endBlock();
        }

        public toString() { return this.getName(); }

        public getStats() : StatsComputer
        {
            var s = new StatsComputer()
            s.dispatch(this)
            return s;
        }

        // cache of canBeOffloaded()
        // Invariant: canBeOffloadedCache == false means the node cannot be offloaded
        public canBeOffloadedCache: CanBeOffloadedState = CanBeOffloadedState.Unknown;

        public canBeOffloaded(): boolean {

            if (this.canBeOffloadedCache != CanBeOffloadedState.Unknown) return !!this.canBeOffloadedCache;
            try {
                // need to compute whether the action can be offloaded
                // first get all methods that are called by this
                var methodFinder = new MethodFinder();
                methodFinder.traverse(this);
                var called = methodFinder.called.filter((a) => a.canBeOffloadedCache === CanBeOffloadedState.Unknown);
                if (called.indexOf(this) < 0) called.push(this);
                called.forEach((a) => a.canBeOffloadedCache = CanBeOffloadedState.AssumeYes);
                var changed = true;
                // go through all methods and mark those that cannot be offloaded, until no change
                while (changed) {
                    changed = false;
                    for (var i = 0; i < called.length; i++) {
                        var a = called[i];
                        if (a.canBeOffloadedCache === CanBeOffloadedState.No) continue;
                        Util.assert(a.canBeOffloadedCache === CanBeOffloadedState.AssumeYes);
                        var res = true;
                        if (a.body)
                            res = a.body.canBeOffloaded();
                        else if (a instanceof LibraryRefAction) {
                            var lib = <LibraryRefAction>a;
                            if (lib.template)
                                res = lib.template.canBeOffloaded();
                        }
                        if (!res) {
                            changed = true;
                            a.canBeOffloadedCache = CanBeOffloadedState.No;
                        }
                    }
                }
                // The remaining actions are offloadable
                called.forEach(function (a) {
                    if (a.canBeOffloadedCache === CanBeOffloadedState.AssumeYes)
                        a.canBeOffloadedCache = CanBeOffloadedState.Yes;
                })
                return !!this.canBeOffloadedCache;
            } catch (e) {
                return false;
            }
        }

        public freshlyCreated()
        {
            if (!this.isPage() || this.modelParameter) return;

            var decl = <RecordDef> Parser.parseDecl("table __name__ { type = 'Object'; fields { } }");
            decl.setName(Script.freshName(this.getName() + " page data"));
            Script.addDecl(decl);

            var l = AST.mkLocal(modelSymbol, decl.entryKind);
            this.modelParameter = new ActionParameter(l);
        }

        private propertyDeflStrings:any;

        public mkPP(name:string, k:Kind) {
            if (!this.propertyDeflStrings) {
                this.propertyDeflStrings = {}
                this.getDescription().replace(/\{hints:([^:{}]*):([^{}]*)/g, (mtch, arg, vals) => {
                    this.propertyDeflStrings[arg] = vals.split(/,/)
                    return ""
                })
            }
            var r = super.mkPP(name, k)
            var v = this.propertyDeflStrings[name]
            if (v) r.setDeflStrings(v)
            return r
        }
    }

    export class ExtensionProperty
        extends Property
    {
        constructor(public shortcutTo:Action)
        {
            super(shortcutTo.getInParameters()[0].getKind(), shortcutTo.getName(), shortcutTo.getDescription(), [], api.core.Nothing)
        }

        public getCategory() { return PropertyCategory.Action; }
        public getParameters() { return this.shortcutTo.getParameters().slice(1); }
        public getResult() { return this.shortcutTo.getResult() }
        public getName() { return this.shortcutTo.getName() }
        public getDescription() { return this.shortcutTo.getDescription() }
        public getSignature() { return this.shortcutTo.getSignature() }
        public getFlags() { return this.shortcutTo.getFlags() }
        public canRename() { return false }
    }

    export class LocalDef
        extends Decl
    {
        constructor() {
            super()
        }
        public nodeType() { return "localDef"; }
        public accept(v:NodeVisitor) { return v.visitLocalDef(this); }
        public getDescription():string { return ": " + this.getKind().toString() + " -- a local variable"; }
        public rename(nn:string) { this.setName(nn); }
        public setKind(k:Kind) { this._kind = k }
        public lastUsedAt = 0;
        public lambdaNameStatus:number;
        public isRegular:boolean;

        public writeWithType(app:App, tw:TokenWriter)
        {
            tw.id(this.getName()).op0(':').kind(app, this.getKind());
        }

        public clone() { return mkLocal(this.getName(), this.getKind()); }
    }

    export interface AppEditorState
    {
        tutorialId?: string;
        tutorialStep?: number;
        tutorialFast?: boolean;
        tutorialValidated?: boolean;
        tutorialRedisplayed?: number;
        tutorialMode?: string;
        tutorialNumSteps?: number;
        tutorialUpdateKey?: string;

        deployWebsite?: string;
        parentScriptGuid?: string;
        collabSessionId?: string;
        groupId?: string;

        buttonPlugins?: StringMap<any>;
        libraryLocalBindings?: StringMap<string>; // library stable id -> installation guid

        splitScreen?: boolean;

        cordova?: Apps.CordovaOptions;
    }

    export interface HeaderWithState extends Cloud.Header
    {
        editorState: AppEditorState;
    }

    export enum LanguageFeature
    {
        None            = 0x0000,
        JS              = 0x0001,
        ContextCheck    = 0x0002,
        Refs            = 0x0004,
        LocalCloud      = 0x0008,
        UnicodeModel    = 0x0010,
        AllAsync        = 0x0020,
        UppercaseMultiplex  = 0x0040,


        Current         = JS|Refs|ContextCheck|LocalCloud|UnicodeModel|AllAsync|UppercaseMultiplex
    }

    export enum AnnotationMode {
        None, Coverage, Profiling, Crash
    }

    export class App
        extends Decl
    {
        static currentVersion = "v2.2,js,ctx,refs,localcloud,unicodemodel,allasync,upperplex";

        constructor(p:Parser) {
            // should be only contructed by the parser
            super()
            this.setStableName("app");
            this.thisLibRef = LibraryRef.topScriptLibrary(this);
            this.setName("no name");
            this.version = App.currentVersion;
        }

        static metaMapping = [ "showAd", "isLibrary", "allowExport", "isCloud", "hasIds" ];

        public nodeType() { return "app"; }
        public things:Decl[] = [];
        public getDescription() { return this.comment; }
        public thisLibRef:LibraryRef;
        public editorState:AppEditorState = {};
        public parentIds:string[] = []; // used for merging
        public rootId:string = uniqueAstId(24);
        private languageFeatures = LanguageFeature.Current;
        private usedIds:any = {};
        public syntheticIds:StringMap<boolean> = {};
        public diffRemovedThings:Decl[];
        public npmModules: StringMap<string> = {};
        public cordovaPlugins: StringMap<string> = {};
        public pipPackages: StringMap<string> = {};
        public touchDevelopPlugins: StringMap<string> = {};

        public recompiler:Compiler;
        public recompiledScript:CompiledScript;
        public clearRecompiler() {
            this.recompiler = null;
            this.recompiledScript = null;
        }

        // visual annotation mode
        public annotatedBy: AnnotationMode = AnnotationMode.None;

        public htmlColor()
        {
            if (!this.color) return ScriptIcons.stableColorFromName(this.getName());
            else return "#" + this.color.replace("#", "").slice(-6);
        }
        public iconName() { return "emptycircle" } // this.icon || ScriptIcons.stableIconFromName(this.getName())
        public iconPath() { return "svg:" + this.iconName() + ",white"; }

        private version:string;
        public icon:string;
        public color:string;
        public iconArtId: string;
        public splashArtId: string;
        public comment: string = "";
        public hasLibraries(): boolean { return this.libraries().length > 0; }
        public hasTests():boolean { return this.allActions().some((a) => a.isTest()); }
        public isTestOnly():boolean { return !this.mainAction() && this.hasTests() }
        public localGuid:string = Util.guidGen();
        public isLibrary:boolean;
        public isCloud: boolean;

        public isTopLevel = false;
        private seed:string;
        public showAd:boolean;
        public isDocsTopic() { return this.comment && /#docs/i.test(this.comment); }
        public isTutorial() { return this.isDocsTopic() && this.allActions().some(a => /^#\d/.test(a.getName())) }
        public allowExport:boolean;
        public hasIds:boolean;
        private stillParsing:boolean = true;
        public accept(v:NodeVisitor) { return v.visitApp(this); }
        public children() { return this.things; }
        private _platform = PlatformCapability.Current;
        public debuggingData: { critical: number; max: { critical: number }; };

        public usesCloud()
        {
            return this.records().some(r => r.cloudEnabled) || this.variables().some(r => r.cloudEnabled);
        }

        public usesCloudLibs()
        {
            return this.librariesAndThis().some(l => l.isCloud())
        }

        private meta:any = {};

        public getGlobalErrorDecl(ignoreLibs:boolean) { return this.things.filter((t) => t.hasErrors() && !(t instanceof Action) && (!ignoreLibs || !(t instanceof LibraryRef)))[0]; }

        public getDefinedKinds()
        {
            var kindList:Kind[] = []
            this.things.map(t => {
                var tp = t.getDefinedKind()
                if (tp) kindList.push(tp)
            })
            return kindList
        }

        public getKinds() : Kind[]
        {
            var kindList = api.getKinds().concat(this.getDefinedKinds())
            this.libraries().forEach((l) => {
                kindList.pushRange(l.getPublicKinds());
            });
            return kindList;
        }

        static platforms = [
            { cap: PlatformCapability.Current,        id: "current",        name: lf("Current device (overrides the rest)") },
            { cap: PlatformCapability.Accelerometer,  id: "accelerometer",  name: lf("Accelerometer") },
            { cap: PlatformCapability.Bluetooth,      id: "bluetooth",      name: lf("Bluetooth") },
            { cap: PlatformCapability.Calendar,       id: "calendar",       name: lf("Calendar") },
            { cap: PlatformCapability.Camera,         id: "camera",         name: lf("Camera") },
            { cap: PlatformCapability.CloudData,      id: "clouddata",      name: lf("Cloud Data") },
            { cap: PlatformCapability.CloudServices,  id: "cloudservices",  name: lf("OneDrive, OneNote") },
            { cap: PlatformCapability.Compass,        id: "compass",        name: lf("Compass") },
            { cap: PlatformCapability.Contacts,       id: "contacts",       name: lf("Contacts") },
            { cap: PlatformCapability.EditorOnly,     id: "editoronly",     name: lf("Editor only") },
            { cap: PlatformCapability.Gyroscope,      id: "gyroscope",      name: lf("Gyroscope") },
            { cap: PlatformCapability.Hawaii,         id: "hawaii",         name: lf("Hawaii") },
            { cap: PlatformCapability.Home,           id: "home",           name: lf("Home media devices") },
            { cap: PlatformCapability.Location,       id: "location",       name: lf("Location") },
            { cap: PlatformCapability.Maps,           id: "maps",           name: lf("Maps") },
            { cap: PlatformCapability.Media,          id: "media",          name: lf("Media libraries on device") },
            { cap: PlatformCapability.Microphone,     id: "microphone",     name: lf("Microphone") },
            { cap: PlatformCapability.Motion,         id: "motion",         name: lf("Motion") },
            { cap: PlatformCapability.MusicAndSounds, id: "musicandsounds", name: lf("Music and Sounds") },
            { cap: PlatformCapability.Network,        id: "network",        name: lf("Network") },
            { cap: PlatformCapability.Proximity,      id: "proximity",      name: lf("NFC") },
            { cap: PlatformCapability.Orientation,    id: "orientation",    name: lf("Orientation") },
            { cap: PlatformCapability.Phone,          id: "phone",          name: lf("Phone specific") },
            { cap: PlatformCapability.Radio,          id: "radio",          name: lf("Radio") },
            { cap: PlatformCapability.Search,         id: "search",         name: lf("Search") },
            { cap: PlatformCapability.Speech,         id: "speech",         name: lf("Speech") },
            { cap: PlatformCapability.Translation,    id: "translation",    name: lf("Translation") },
            { cap: PlatformCapability.Tiles,          id: "tiles",          name: lf("Tiles") },
            { cap: PlatformCapability.Npm,            id: "npm",            name: lf("Node Package Manager") },
            { cap: PlatformCapability.Cordova,        id: "cordova",        name: lf("Cordova Plugin Manager") },
            { cap: PlatformCapability.Shell,          id: "shell",          name: lf("TouchDevelop Local Shell") },
        ];

        static capabilityName(p:PlatformCapability)
        {
            return App.platforms.filter((k) => !!(k.cap & p)).map((k) => k.name).join(", ")
        }

        static capabilityString(p:PlatformCapability)
        {
            return App.platforms.filter((k) => !!(k.cap & p)).map((k) => k.id).join(",")
        }

        static orderThings(things:Decl[], mixActions = false)
        {
            var score = (t:Decl) => {
                if (t instanceof Action) {
                    var a = <Action>t;
                    if (mixActions) return 1

                    if (a.isPage()) return 3;
                    else if (a.isEvent()) return 2;
                    else if (a.isMainAction()) return 0.5;
                    else if (a.isPrivate) return 1.5;
                    else return 1;
                } else if (t instanceof GlobalDef) {
                    var g = <GlobalDef>t;
                    if (g.isResource) return 5;
                    else return 4;
                } else if (t instanceof RecordDef) {
                    return 6;
                } else if (t instanceof LibraryRef) {
                    return 7;
                } else {
                    return 0; // unknown
                }
            }

            var cmp = (a:Decl, b:Decl) => {
                var diff = score(a) - score(b);
                if (diff == 0) {
                    var an = a.getName()
                    var bn = b.getName()
                    for (var i = 0; i < an.length; ++i)
                        if (an.charAt(i) != bn.charAt(i))
                            break;
                    if (/^[0-9]$/.test(an.charAt(i)) && /^[0-9]$/.test(bn.charAt(i))) {
                        var dot = false;
                        var c = ""
                        var beg = i - 1;
                        while (beg > 0 && /^[0-9\.]$/.test(c = an.charAt(beg))) {
                            if (c == ".") {
                                if (dot) break;
                                dot = true;
                            }
                            beg--;
                        }
                        beg++;
                        var am = /^(\d*(\.\d+)?)/.exec(an.slice(beg))
                        var bm = /^(\d*(\.\d+)?)/.exec(bn.slice(beg))
                        return parseFloat(am[1]) - parseFloat(bm[1])
                    }

                    if (a.getName() < b.getName()) return -1;
                    else if (a == b) return 0;
                    else return 1;
                } else return diff;
            }

            things.sort(cmp);
        }

        public orderedThings(mixActions = false)
        {
            var th = this.things.slice(0);
            App.orderThings(th, mixActions)
            return th;
        }

        public canUseProperty(p:IProperty)
        {
            return (this.getPlatform() & p.getCapability()) == p.getCapability();
        }

        public canUseCapability(p:PlatformCapability)
        {
            return (this.getPlatform() & p) == p;
        }

        public supportsAllPlatforms(p:PlatformCapability)
        {
            return (this.getPlatform() & p) == this.getPlatform();
        }

        public getPlatform() : PlatformCapability
        {
            if (this._platform & PlatformCapability.Current)
                return api.core.currentPlatform;
            return this._platform;
        }

        public getPlatformRaw() : PlatformCapability
        {
            return this._platform;
        }

        public setPlatform(p:PlatformCapability)
        {
            this._platform = p;
        }

        private setPlatformString(p:string)
        {
            if (!p) this._platform = PlatformCapability.None;

            var platform = App.fromCapabilityList(p.split(/,/));
            if (platform == 0x3fffff) platform = PlatformCapability.Current;
            if (platform) this._platform = platform;
        }

        static _platformMapping:any;
        static capabilityByName(n:string)
        {
            if (!App._platformMapping) {
                App._platformMapping = {}
                App.platforms.forEach((k) => App._platformMapping[k.id] = k.cap);
            }

            n = n.toLowerCase();
            if (App._platformMapping.hasOwnProperty(n)) return App._platformMapping[n];
            else return PlatformCapability.None;
        }

        static fromCapabilityList(ps:string[])
        {
            var platform = PlatformCapability.None;
            ps.forEach((p) => { platform |= App.capabilityByName(p) })
            return platform;
        }

        public getCapabilityString()
        {
            return App.capabilityString(this._platform);
        }

        public getIconArtId() {
            return this.iconArtId;
        }

        public getBoxInfo()
        {
            return lf("script properties");
        }

        private setVersion(v:string)
        {
            var f = LanguageFeature.None;
            v.split(/,/).forEach((t) => {
                switch (t) {
                    case 'js':              f |= LanguageFeature.JS; break;
                    case 'ctx':             f |= LanguageFeature.ContextCheck; break;
                    case 'refs':            f |= LanguageFeature.Refs; break;
                    case 'localcloud':      f |= LanguageFeature.LocalCloud; break;
                    case 'unicodemodel':    f |= LanguageFeature.UnicodeModel; break;
                    case 'allasync':        f |= LanguageFeature.AllAsync; break;
                    case 'upperplex':       f |= LanguageFeature.UppercaseMultiplex; break;
                    default: break;
                }
            })
            this.languageFeatures = f;
        }

        public addFeatures(f:LanguageFeature)
        {
            this.languageFeatures |= f;
        }

        public featureMissing(f:LanguageFeature)
        {
            return (this.languageFeatures & f) == 0;
        }

        public setMeta(k:string, v:string)
        {
            if (<any>v === true) v = "yes";
            switch (k) {
            case "icon": this.icon = v; break;
            case "name": this.setName(v); break;
            case "color": this.color = v; break;
            case "seed": this.seed = v; break;
            case "version": this.setVersion(v); break;
            case "platform": this.setPlatformString(v); break;
            case "parentIds": this.parentIds = v.split(/,\s*/).filter(x => !!x); break;
            case "editorState":
                if (v) try { this.editorState = JSON.parse(v); } catch (e) { Util.check(false, "editor state corrupted"); }
                break;
            case "rootId": this.rootId = v; break;
            case "iconArtId": this.iconArtId = v; break;
            case "splashArtId": this.splashArtId = v; break;
            default:
                if (App.metaMapping.indexOf(k) >= 0)
                    (<any>this)[k] = v == "yes";
                this.meta[k] = v;
            }
        }

        public mainAction()
        {
            var c0 = this.allActions().filter((a:Action) => a.isRunnable())
            var c1 = c0.filter((a) => !a.isPage())
            var c2 = c0.filter((a:Action) => a.getName() == "main");
            if (c2.length == 0) c2 = c1;
            if (c2.length == 0) c2 = c0;
            /*
            // the phone app doesn't sort
            // we don't want locale-sensitive sort here
            c1.sort((a, b) => {
                var aa = a.getName().toLowerCase();
                var bb = b.getName().toLowerCase();
                if (aa < bb) return -1;
                else if (aa > bb) return +1;
                else return 0;
            });
            */
            if (c2.length > 0) return c2[0];
            else return null;
        }

        public findActionByName(name: string) : Action {
            for (var i = 0; i < this.things.length; i++) {
                var t = this.things[i];
                if (t instanceof Action && t.getName() == name) return <Action>t;
            }
            return null;
        }

        public allActions():Action[] { return <Action[]>this.things.filter((t) => t instanceof Action); }
        public actions():Action[] { return <Action[]>this.things.filter((t) => t instanceof Action && !((<Action>t).isEvent()) && !((<Action>t).isActionTypeDef())); }
        public events():Action[] { return <Action[]>this.things.filter((t) => t instanceof Action && ((<Action>t).isEvent())); }
        public actionTypeDefs():Action[] { return <Action[]>this.things.filter((t) => t instanceof Action && ((<Action>t).isActionTypeDef())); }
        public libraries():LibraryRef[] { return <LibraryRef[]>this.things.filter((t) => t instanceof LibraryRef); }
        public librariesAndThis():LibraryRef[] { return [this.thisLibRef].concat(this.libraries()); }
        public variables():GlobalDef[] { return <GlobalDef[]>this.things.filter((t) => t instanceof GlobalDef && !(<AST.GlobalDef> t).isResource); }
        public resources():GlobalDef[] { return <GlobalDef[]>this.things.filter((t) => t instanceof GlobalDef && !!(<AST.GlobalDef> t).isResource); }
        public variablesAndResources():GlobalDef[] { return <GlobalDef[]>this.things.filter((t) => t instanceof GlobalDef); }
        public records():RecordDef[] { return <RecordDef[]>this.things.filter((t) => t instanceof RecordDef); }

        public parsingFinished()
        {
            //this.stillParsing = true;
            //this.usedIds = {};
            //this.things.forEach(t => this.addToUsedIds(t))
            this.stillParsing = false;
        }

        public setStableNames()
        {
            //TODO remove?
        }

        public findStableName(s:string) : Decl
        {
            if (!s) return null;
            if (s == this.getStableName()) return this;
            return this.things.filter((d) => d.getStableName() == s)[0];
        }


        public toMeta():any
        {
            var r = {
                type: "app",
                version: App.currentVersion,
                name: this.getName(),
                icon: this.iconName(),
                color: this.htmlColor(),
                comment: TokenWriter.normalizeComment(this.comment),
                seed: this.seed,
                localGuid: this.localGuid,
                platform: this.getCapabilityString(),
                rootId: this.rootId,
                parentIds: this.parentIds.join(","),
            };
            if (this.iconArtId) r["iconArtId"] = this.iconArtId;
            if (this.splashArtId) r["splashArtId"] = this.splashArtId;

            App.metaMapping.forEach((k) => {
                r[k] = (<any>this)[k] ? "yes" : "no";
            })

            return r;
        }

        public toJsonScript() : any
        {
            var r = {
                kind: "script",
                time: 0,
                id: "",
                userid: "me",
                username: "Me",
                name: this.getName(),
                description: this.comment,
                icon: this.icon,
                iconbackground: this.color,
                iconArtId: this.iconArtId,
                splashArtId: this.splashArtId,
                positivereviews: 0,
                cumulativepositivereviews: 0,
                comments: 0,
                capabilities: [],
                flows: [],
                haserrors: this.hasErrors(),
                rootid: "",
                updateid: "",
                ishidden: true,
                islibrary: this.isLibrary,
                installations: 0,
                runs: 0,
            };
            return r;
        }

        public loadMeta(m:any)
        {
            Object.keys(m).forEach((k) => {
                this.setMeta(k, m[k]);
            });
            this.comment = m.comment || "";
        }

        public serializeFinal()
        {
            var tw = TokenWriter.forStorage();
            this.writeFinal(tw);
            return tw.finalize();
        }

        public serializeMeta()
        {
            var tw = TokenWriter.forStorage();
            this.writeMeta(tw);
            return tw.finalize();
        }

        private writeMeta(tw:TokenWriter)
        {
            tw.meta("version", App.currentVersion);
            tw.meta("name", this.getName());
            tw.metaOpt("icon", this.icon);
            var c = this.color
            if (c) {
                if (c.length == 7 && c[0] == '#') c = "#ff" + c.slice(1)
                c = c.toLowerCase()
                tw.metaOpt("color", c)
            }
            tw.meta("rootId", this.rootId);
            tw.metaOpt("iconArtId", this.iconArtId);
            tw.metaOpt("splashArtId", this.splashArtId);

            App.metaMapping.forEach((k) => {
                tw.metaOpt(k, (<any>this)[k] ? "yes" : "");
            })
            tw.meta("platform", this.getCapabilityString());
            tw.meta("parentIds", this.parentIds.join(","));
            if (!!this.comment)
                tw.comment(this.comment);
        }

        private writeFinal(tw:TokenWriter)
        {
        }

        public writeTo(tw:TokenWriter)
        {
            this.writeMeta(tw);
            this.things.forEach((t) => t.writeTo(tw));
            if (!tw.skipActionBodies)
                this.writeFinal(tw);
        }

        public notifyChangeAll()
        {
            this.notifyChange();
            for (var i = 0; i < this.things.length; ++i)
                this.things[i].notifyChange();
        }

        static sanitizeScriptTextForCloud(s:string)
        {
            var r = "";
            if (s) {
                s = s.replace(/(\r?\n)+$/, "");
                s.split(/\n/).forEach((ln) => {
                    if (/^meta (stableNames|editorState)/.test(ln)) { }
                    else {
                        r += ln + "\n";
                    }
                });
            }
            return r;
        }

        private addToUsedIds(t:Decl)
        {
            var u = this.usedIds;
            var process = (t:IStableNameEntry) => {
                if (!t.getStableName() || /_/.test(t.getStableName())) {
                    var enc = ""
                    if (!this.stillParsing) {
                        enc = uniqueAstId(16)
                    } else {
                        // otherwise, we're dealing with legacy script that needs a deterministic stable name
                        enc = Util.toUTF8(t.getName().replace(/[ _]/g, ""))
                        enc = enc.replace(/[^a-zA-Z0-9]/g, (c) => c.charCodeAt(0).toString(16))
                        if (enc.length > 20)
                            enc = enc.slice(0, 20)
                        if (/^[0-9]/.test(enc)) enc = "x" + enc
                        if (u.hasOwnProperty(enc)) {
                            var add = 1
                            while (u.hasOwnProperty(enc + add)) add++;
                            enc = enc + add
                        }
                    }
                    this.syntheticIds[enc] = true
                    t.setStableName(enc)
                }
                u[t.getStableName()] = t;
            }

            var declExists = (d:Decl) => {
                return d && (d == t || this.things.indexOf(d) >= 0);
            }

            if (t.getStableName() && declExists(u[t.getStableName()]))
                t.setStableName(null);

            process(t);

            if (t instanceof RecordDef)
                (<RecordDef>t).getFields().forEach(f => {
                    if (f.getStableName()) {
                        var q = u[f.getStableName()]
                        if (q &&
                            (declExists(q) ||
                             (q instanceof RecordField && declExists(q.def()) && q.def().getFields().indexOf(q) >= 0)))
                            f.setStableName(null);
                    }
                    process(f);
                })
        }

        public recomputeStableName(t:AST.Decl)
        {
            this.addToUsedIds(t);
        }

        public resetStableName(t:AST.Decl)
        {
            t.setStableName(null);
            this.recomputeStableName(t)
        }

        public addDecl(t:AST.Decl)
        {
            t.parent = this;
            this.addToUsedIds(t);
            this.things.push(t);
        }

        public deleteDecl(t:AST.Decl)
        {
            var i = this.things.indexOf(t);
            t.deleted = true;
            if (i >= 0)
                this.things.splice(i, 1);
        }

        public hasDecl(t:AST.Decl) { return t == this || this.things.indexOf(t) >= 0; }

        public namesMatch(a:string, b:string)
        {
            return a.replace(/\s*\d+$/, "") == b.replace(/\s*\d+$/,"");
        }

        public freshName(n:string)
        {
            return AstNode.freshNameCore(n,
                (n:string) =>
                    api.getThing(n) != null ||
                    n == "this" ||
                    this.things.some((d:Decl) => d.getName() == n || d.getCoreName() == n));
        }

        public findAstNodeById(id:string, allowNonStmt = false)
        {
            if (!id) return null;
            var s = new SearchForId(id)
            s.dispatch(this)
            if (s.foundNode && (allowNonStmt || s.foundNode instanceof Stmt))
                return { node: s.foundNode, stmt: s.lastStmt, decl: s.lastDecl }
            else
                return null;
        }

        public findStmtByStableName(name: string): Stmt
        {
            var s = new SearchForStableName(name);
            s.dispatch(this)
            return <Stmt>s.found;
        }
    }

    // -------------------------------------------------------------------------------------------------------
    // Expressions
    // -------------------------------------------------------------------------------------------------------

    export class ExprHolder
        extends AstNode
    {
        public tokens:Token[];
        public parsed:Expr;
        public locals:LocalDef[];
        public definedLocals:LocalDef[];
        public looksLikeVarDef: boolean;
        public hasFix: boolean;
        public profilingExprData: ProfilingAstNodeData;
        public debuggingData: DebuggingAstNodeInfo = {};
        public reachingDefs: ReachingDefsMgr;
        public dominators: DominatorsMgr;
        public usedSet: UsedSetMgr;
        public aeSet: AvailableExpressionsMgr;
        public cpSet: ConstantPropagationMgr;
        public diffTokens:Token[];
        public isAwait:boolean;

        /** white + first 27 colors from http://www.vendian.org/mncharity/dir3/blackbody/ */
        static heatmapColors: string[] =
            ["#ffffff", "#fff5f5", "#fff3ef", "#fff0e9", "#ffeee3", "#ffebdc", "#ffe8d5",
            "#ffe4ce", "#ffe1c6", "#ffddbe", "#ffd9b6", "#ffd5ad", "#ffd1a3", "#ffcc99",
            "#ffc78f", "#ffc184", "#ffbb78", "#ffb46b", "#ffad5e", "#ffa54f", "#ff9d3f",
            "#ff932c", "#ff8912", "#ff7e00", "#ff7300", "#ff6500", "#ff5300", "#ff3800"];
        static profilingDurationBucketSize: number;  // each bucket gets its own color

        constructor() {
            super()
        }
        public nodeType() { return "exprHolder"; }
        public hasValue() { return true; }
        public isPlaceholder() { return this.tokens.length == 0 || (this.tokens.length == 1 && this.tokens[0].isPlaceholder()); }
        private calcNode() { return this; }
        public accept(v:NodeVisitor) { return v.visitExprHolder(this); }
        public children() { return this.tokens; }
        public assignmentInfo() { return !this.parsed ? null : this.parsed.assignmentInfo(); }
        public hint = "";
        public getError()
        {

            if (this._error != null)
                return this._error;
            if (this.debuggingData.errorMessage)
                return this.debuggingData.errorMessage;
            for (var i = 0; i < this.tokens.length; ++i)
                if (this.tokens[i]._error != null)
                    return this.tokens[i]._error;
            return null;
        }

        public topCall(e:Expr = null):Call
        {
            if (!e) e = this.parsed

            if (!e) return null

            var prop = e.getCalledProperty()
            if (prop == api.core.AssignmentProp)
                return this.topCall((<Call>e).args[1])
            else if (prop == api.core.AsyncProp)
                return this.topCall((<Call>e).args[1])
            else if (e instanceof Call)
                return <Call>e
            return null
        }

        public getLiteral():any
        {
            if (this.tokens.length == 1) return this.tokens[0].getLiteral()
            return undefined;
        }

        public clearError()
        {
            super.clearError();
            this.hint = "";
            this.hasFix = false
        }

        public writeTo(tw:TokenWriter)
        {
            if (this.isPlaceholder()) {
                tw.op("...");
                return;
            }

            var isDigit = (o:Token) => o instanceof Operator && /^[0-9\.]$/.test((<Operator>o).data);

            var prev = null;
            this.tokens.forEach((t:Token) => {
                if (isDigit(t)) {
                    if (!isDigit(prev))
                        tw.sep();
                    tw.op0((<Operator>t).data);
                } else {
                    tw.node(t);
                }
                prev = t;
            });
        }

        public forSearch()
        {
            var r = "";
            var wasDigit = false;
            this.tokens.forEach((t:Token) => {
                var isDigit = false;
                var s = t.forSearch();
                if (t instanceof Operator)
                    isDigit = /[0-9\.]/.test(s);
                if (!!s) {
                    if (wasDigit && isDigit)
                        r += s;
                    else
                        r += " " + s;
                    wasDigit = isDigit;
                }
            });
            return r;
        }

        public canBeOffloaded(): boolean {
            if (this.parsed) {
                return this.parsed.canBeOffloaded();
            } else {
                return super.canBeOffloaded();
            }
        }
    }

    // -------------------------------------------------------------------------------------------------------
    // Tokens
    // -------------------------------------------------------------------------------------------------------

    export class Token
        extends AstNode
    {
        public tokenFix:string;

        constructor() {
            super()
        }
        public getText() { return null; }
        public toString() { return this.getText(); }
        public hasValue() { return true; }
        public renderedAs:HTMLElement;
        public forSearch() { return ""; }
        public matches(d:AstNode) { return false; }

        public getCall():Call { return null }
        public getOperator():string { return null; }
        public getFunArgs():string[] { return null; }
        public getProperty():IProperty { return null; }
        public getCalledProperty():IProperty { return null; }
        public getLiteral():any { return null; }
        public getStringLiteral():string
        {
            if (typeof this.getLiteral() == "string")
                return this.getLiteral()
            return null
        }
        public getThing():Decl { return null; }
        public getLocalDef():LocalDef {
            var r = this.getThing()
            if (r instanceof LocalDef) return <LocalDef>r
            else return null;
        }
        public isDigit() { return false }

        public getForwardedDecl():Decl
        {
            var p = this.getProperty()
            if (!p) return null
            return p.forwardsTo()
        }

        public eq(other:Token):boolean
        {
            return this.nodeType() == other.nodeType() && this.getText() == other.getText();
        }
    }

    export class Expr
        extends Token
    {
        public loc:StackOp;

        constructor() {
            super()
        }
        public flatten(prop:IProperty) { return [this]; }

        public calledAction() : Action { return null; }
        public anyCalledAction():Action { return this.calledAction() || this.calledExtensionAction() }
        public calledExtensionAction():Action { return null }
        public referencedRecordField() : RecordField { return null; }
        public referencedRecord() : RecordDef { return null; }
        public referencedData() : GlobalDef { return null; }
        public referencedLibrary() : LibraryRef { return null; }
        public getLiftedSetter() : IProperty { return null; }
        public calledProp() : IProperty { return null; }
        public assignmentInfo() : AssignmentInfo { return null; }
        public isRefValue() { return false }
        public allowRefUse() { return false }
    }

    export class Literal
        extends Expr
    {
        public data:any;
        public stringForm:string; // set for number literals
        constructor() {
            super()
        }
        public nodeType() { return "literal"; }
        public getText() { return this.data + ""; }
        public accept(v:NodeVisitor) { return v.visitLiteral(this); }
        public getLiteral() { return this.data; }

        public writeTo(tw:TokenWriter)
        {
            switch (typeof this.data) {
            case "string":
                tw.string(this.data);
                break;
            case "number":
                // TODO get rid of 'e' notation
                // note that this is pretty much dead code most of the time, as numbers are represented as sequences of Operator nodes
                tw.op(this.data.toString());
                break;
            case "boolean":
                tw.id(this.data ? "true" : "false");
                break;
            default:
                Util.oops("cannot writeTo " + this.data);
                break;
            }
        }

        public forSearch() : string
        {
            switch (typeof this.data) {
            case "string":
                return this.data.toLowerCase();
            case "number":
                return this.data.toString();
            case "boolean":
                return this.data ? "true" : "false";
            default:
                Util.oops("cannot writeTo " + this.data);
                return "";
            }
        }

        public canBeOffloaded(): boolean { return true; }
    }

    export class Operator
        extends Token
    {
        public data:string;
        public call:Call;
        public funArgs:LocalDef[];

        constructor() {
            super()
        }
        public getText() { return this.data; }
        public nodeType() { return "operator"; }
        public accept(v:NodeVisitor) { return v.visitOperator(this); }
        public getOperator() { return this.data; }
        public isDigit() { return /^[0-9.\-]$/.test(this.data) }

        public funSpan:number;

        public writeTo(tw:TokenWriter)
        {
            if (this.data == "(" || this.data == ")")
                tw.op0(this.data);
            else if (this.data == ",")
                tw.op0(this.data).space();
            else if (/^fun:/.test(this.data))
                tw.op("fun:" + this.getFunArgs().map(idUrlQuote).join(","))
            else
                tw.op(this.data);
        }

        public forSearch() { return this.data; }

        public getFunArgs():string[]
        {
            if (!/^fun:/.test(this.data))
                return

            if (this.funArgs)
                return this.funArgs.map(p => p.getName())

            return this.data.slice(4).split(",").map(idUrlUnquote)
        }
    }

    export class PropertyRef
        extends Token
    {
        public data:string;
        public prop:IProperty;
        public call:Call;
        public skipArrow:boolean;
        public fromOp:Operator;
        constructor() {
            super()
        }
        public nodeType() { return "propertyRef"; }
        public accept(v:NodeVisitor) { return v.visitPropertyRef(this); }
        public getText():string { return !this.prop ? this.data : this.prop.getName(); }
        public getProperty() { return this.prop }

        public getOrMakeProp():IProperty
        {
            if (this.prop) return this.prop;
            return new UnresolvedProperty(api.core.Unknown, this.data)
        }

        static mkProp(p:IProperty)
        {
            var r = new PropertyRef();
            r.prop = p;
            return r;
        }

        public writeTo(tw:TokenWriter)
        {
            var c = tw.lastChar;
            if (!/^[A-Za-z0-9_\)]$/.test(c))
                tw.space();
            tw.op0("\u2192").id0(this.getText());
        }

        public forSearch() { return this.getText().toLowerCase(); }
        public matches(d:AstNode) {
            if (!this.prop) return false;
            if (this.prop.forwardsTo() == d)
                return true;
            if (d instanceof RecordField && (<RecordField>d).asProperty() == this.prop)
                return true;
            return false;
        }
        public canBeOffloaded(): boolean { return this.prop.canBeOffloaded(); }
        public getCall() { return this.call }
    }

    export class ThingRef
        extends Expr
    {
        static placeholderPrefix = "\u0001need ";

        public data:string;
        public def:Decl;
        public _lastTypechecker:any;
        constructor() {
            super()
        }
        public getText() { return !this.def ? this.data : this.def.getName(); }
        public shortName()
        {
            return !this.def ? null :
            this.def instanceof SingletonDef ? this.def.getKind().shortName() : null;
        }
        public nodeType() { return "thingRef"; }
        public isPlaceholder() { return this.getText() == "$skip" || this.getText() == "..."; }
        public accept(v:NodeVisitor) { return v.visitThingRef(this); }
        public forceLocal = false;
        public getThing():Decl { return this.def; }

        public writeTo(tw:TokenWriter)
        {
            if (this.def instanceof LocalDef)
                tw.sep().op0("$").id0(this.getText());
            else if (this.def instanceof PlaceholderDef)
                tw.id("\u0001" + this.def.getName())
            else
                tw.id(this.getText());
        }

        public forSearch() { return this.getText().toLowerCase() }
        public matches(d:AstNode) { return this.def == d; }
        public canBeOffloaded(): boolean { return this.def.canBeOffloaded(); }
    }

    export class AssignmentInfo
    {
        public missingArguments = 0;
        public definedVars:LocalDef[] = [];
        public targets:Expr[] = [];
        public sources:LocalDef[] = [];
        public isPagePush = false;
        public fixContextError:boolean;
    }

    export class Call
        extends Expr
    {
        public propRef:PropertyRef;
        public args:Expr[];
        public _assignmentInfo:AssignmentInfo;
        public runAsAsync:boolean;
        public autoGet:boolean;
        public isSynthetic:boolean;
        public savedFix:Call;
        public funAction:InlineAction;
        public optionalConstructor:InlineActions;
        public compiledTypeArgs:any;

        constructor() {
            super()
        }
        public children() { return this.args; }

        public assignmentInfo() { return this._assignmentInfo; }

        public nodeType() { return "call"; }

        public getCalledProperty():IProperty { return this.prop(); }

        public getText()
        {
            var res = this.propRef.getText() + "(";
            for (var i = 0; i < this.args.length; ++i) {
                if (i > 0) res += ", ";
                res += this.args[i].getText();
            }
            res += ")";
            return res;
        }

        public referencedRecord()
        {
            var prop = this.prop()
            if (prop instanceof AST.RecordDef)
                return <AST.RecordDef>prop
            return null
        }

        public referencedRecordField()
        {
            var prop = this.prop()
            if (!prop) return null
            var fwd = prop.forwardsToStmt()
            if (fwd instanceof RecordField)
                return <RecordField>fwd
            return null
        }

        public referencedData():AST.GlobalDef
        {
            if (this.prop() && this.prop().getCategory() == PropertyCategory.Data)
                return <GlobalDef>this.prop().forwardsTo();
            else
                return null;
        }

        public referencedLibrary() : LibraryRef
        {
            var prop = this.prop()
            if (prop instanceof LibraryRef)
                return <LibraryRef>prop
            return null
        }

        public getCall() { return this }

        public getLiftedSetter()
        {
            var prop = this.prop()
            if (!prop) return null

            if (prop.getFlags() & PropertyFlags.Async) return null

            if (prop.getParameters().length != 1) return null
            var tp = prop.getResult().getKind()
            if (tp.equals(api.core.Nothing)) return null
            var setter = prop.parentKind.getProperty("set " + prop.getName())
            if (setter &&
                !(setter.getFlags() & PropertyFlags.Async) &&
                setter.getResult().getKind().equals(api.core.Nothing)) {
                var parms = setter.getParameters()
                if (parms.length == 2 && parms[1].getKind().equals(tp))
                    return setter
            }
            return null
        }

        public isRefValue()
        {
            var gd = this.referencedData()
            if (gd) return true
            var rcf = this.referencedRecordField()
            if (rcf && !rcf.isKey) return true;
            // if (this.getLiftedSetter()) return true;
            return false
        }

        public allowAssignment()
        {
            return this.allowRefUse() || !!this.getLiftedSetter();
        }

        public allowRefUse()
        {
            if (!this.isRefValue()) return false
            var gd = this.referencedData()
            if (gd && gd.readonly) return false
            return true
        }

        public prop() { return this.propRef.prop; }
        public calledProp() { return this.prop(); }

        public flatten(prop:IProperty) : Expr[]
        {
            if (this.propRef.prop == prop) {
                return this.args.collect((e:Expr) => e.flatten(prop));
            } else {
                return [this];
            }
        }

        public accept(v:NodeVisitor) { return v.visitCall(this); }

        public calledAction():AST.Action
        {
            if (this.prop() && this.prop().getCategory() == PropertyCategory.Action)
                return <Action>this.prop().forwardsTo();
            else
                return null;
        }

        public calledExtensionAction():AST.Action
        {
            var prop = this.prop()
            if (prop instanceof ExtensionProperty)
                return (<ExtensionProperty>prop).shortcutTo

            var act = this.calledAction()
            if (act && act.isExtensionAction())
                return act.extensionForward();

            return null
        }

        public canBeOffloaded(): boolean {
            var act = this.calledAction();
            var prop = this.prop();

            for (var i = 0; i < this.args.length; i++) {
                if (!this.args[i].canBeOffloaded()) return false;
            }

            if (prop == api.core.TupleProp ||
                prop == api.core.AssignmentProp ||
                prop == api.core.StringConcatProp ||
                prop == api.core.AndProp ||
                prop == api.core.OrProp) {
                return true;
            }

            if (act) {
                if (act.isPage()) { return false; }
                else return act.canBeOffloaded();
            }
            return this.prop().canBeOffloaded();
        }

        public awaits()
        {
            return !this.runAsAsync && this.prop() && !!(this.prop().getFlags() & PropertyFlags.Async);
        }
    }

    // -------------------------------------------------------------------------------------------------------
    // Constructors
    // -------------------------------------------------------------------------------------------------------

    export function mkLocal(name:string, k:Kind)
    {
        var r = new LocalDef();
        r.setName(name);
        r._kind = k;
        return r;
    }

    export function mkLit(v:any)
    {
        var r = new Literal();
        r.data = v;
        return r;
    }

    export function mkOp(v:string) : Operator
    {
        var o = new Operator();
        o.data = v;
        return o;
    }

    export function mkFunOp(args:string[]) : Operator
    {
        return mkOp("fun:" + args.map(idUrlQuote).join(","))
    }

    export function mkThing(v:string, forceLocal = false) : Expr
    {
        if (v == "true" || v == "false")
            return mkLit(v == "true");
        var t = new ThingRef();
        t.data = v;
        t.forceLocal = forceLocal;
        return t;
    }

    export function mkLocalRef(l:LocalDef)
    {
        return mkThing(l.getName(), true)
    }

    export function mkPlaceholderByKind(k:Kind)
    {
        return mkPlaceholder(<any>{ getName: () => "this", getKind: () => k })
    }

    export function mkPlaceholder(p:PropertyParameter)
    {
        var name = p.getName();
        if (name == "this" || p.parentProperty.getInfixPriority() > 0 || name == p.getKind().getStemName())
            name = "";
        var def = new PlaceholderDef();
        def.label = name;
        def._kind = p.getKind();
        var t = new ThingRef();
        t.def = def;
        t.data = def.getName();
        return t;
    }

    export function mkPropRef(v:string) : PropertyRef
    {
       var p = new PropertyRef();
       p.data = v;
       return p;
    }

    export function mkSingletonDef(n:string, k:Kind) : SingletonDef
    {
        var s = new SingletonDef();
        s.setName(n);
        s._kind = k;
        if (k.isPrivate) s._isBrowsable = false;
        return s;
    }

    export function mkTok(json:any) : Token
    {
        switch (json.type) {
        case "literal": return mkLit(json.data);
        case "operator": return mkOp(json.data);
        case "propertyRef": return mkPropRef(json.data);
        case "thingRef": return mkThing(json.data, json.forceLocal);
        default: Util.die();
        }
    }

    export function mkParam(name:string, k:Kind) { return mkLocal(name, k); }

    export function mkPlaceholderThingRef() { return mkThing("$skip"); }

    export function mkExprStmt(expr:ExprHolder, p:Parser = null)
    {
        var r = new ExprStmt();
        if(p) {
            r.setStableName(p.consumeLabel());
        }

        r.expr = expr;
        return r;
    }

    export function exprToStmt(expr: Expr)
    {
        var r = new ExprHolder();
        r.tokens = [];
        r.locals = [];
        r.parsed = expr;
        return mkExprStmt(r);
    }

    export function mkWhere(expr:ExprHolder)
    {
        var r = new Where();
        r.condition = expr;
        return r;
    }

    export function mkFakeCall(prop:PropertyRef, args:Expr[] = [])
    {
        var t = new Call();
        t.propRef = prop;
        t.args = args;
        t.isSynthetic = true;
        return t;
    }

    export function mkCall(prop:PropertyRef, a:Expr[])
    {
        var t = new Call();
        Util.assert(a.length > 0)
        t.propRef = prop;
        prop.call = t;
        t.args = a;
        return t;
    }

    export function idUrlQuote(s:string)
    {
        var sb = "";
        for (var i = 0; i < s.length; ++i) {
            var c = s.charAt(i);
            if (/[A-Za-z0-9]/.test(c))
                sb += c;
            else if (c == " ")
                sb += "_";
            else
                sb += "-" + (c.charCodeAt(0)|0x10000).toString(16).slice(-4);
        }
        return sb;
    }

    export function idUrlUnquote(s:string)
    {
        var r = ""
        for (var i = 0; i < s.length; ++i) {
            var c = s.charAt(i);
            if (c == "_") {
                r += " ";
            } else if (c == "/" || c == "-") {
                r += String.fromCharCode(parseInt(s.slice(i + 1, i + 5), 16))
                i += 4
            } else {
                r += c;
            }
        }
        return r;
    }

    export function isProperKind(k:Kind)
    {
        return k && k != api.core.Unknown && !(k instanceof MultiplexKind)
    }

    // -------------------------------------------------------------------------------------------------------
    // Visitor
    // -------------------------------------------------------------------------------------------------------

    export class NodeVisitor
    {
        public visitAstNode(node:AstNode):any { return null; }

        public visitToken(tok:Token) { return this.visitAstNode(tok); }
        public visitOperator(n:Operator) { return this.visitToken(n); }
        public visitPropertyRef(n:PropertyRef) { return this.visitToken(n); }

        public visitExpr(tok:Expr) { return this.visitToken(tok); }
        public visitLiteral(n:Literal) { return this.visitExpr(n); }
        public visitThingRef(n:ThingRef) { return this.visitExpr(n); }
        public visitCall(n:Call) { return this.visitExpr(n); }

        public visitExprHolder(n:ExprHolder) { return this.visitAstNode(n); }

        public visitStmt(n:Stmt) { return this.visitAstNode(n); }
        public visitComment(n:Comment) { return this.visitStmt(n); }
        public visitBlock(n:Block) { return this.visitStmt(n); }
        public visitCodeBlock(n:CodeBlock) { return this.visitBlock(n); }
        public visitConditionBlock(n:ConditionBlock) { return this.visitBlock(n); }
        public visitParameterBlock(n:ParameterBlock) { return this.visitBlock(n); }
        public visitResolveBlock(n:ResolveBlock) { return this.visitBlock(n); }
        public visitBindingBlock(n:BindingBlock) { return this.visitBlock(n); }
        public visitFieldBlock(n:FieldBlock) { return this.visitBlock(n); }
        public visitInlineActionBlock(n:InlineActionBlock) { return this.visitBlock(n); }
        public visitFor(n:For) { return this.visitStmt(n); }
        public visitForeach(n:Foreach) { return this.visitStmt(n); }
        public visitWhile(n:While) { return this.visitStmt(n); }
        public visitBox(n:Box) { return this.visitStmt(n); }
        public visitAnyIf(n:If) { return this.visitStmt(n); }
        public visitIf(n:If) { return this.visitAnyIf(n); }
        public visitElseIf(n:If) { return this.visitAnyIf(n); }
        public visitForeachClause(n:ForeachClause) { return this.visitStmt(n); }
        public visitWhere(n:Where) { return this.visitForeachClause(n); }
        public visitExprStmt(n:ExprStmt) { return this.visitStmt(n); }
        public visitInlineActions(n:InlineActions) { return this.visitStmt(n); }
        public visitInlineAction(n:InlineAction) { return this.visitStmt(n); }
        public visitOptionalParameter(n:OptionalParameter) { return this.visitStmt(n); }
        public visitActionParameter(n:ActionParameter) { return this.visitStmt(n); }
        public visitActionHeader(n:ActionHeader) { return this.visitStmt(n); }
        public visitDecl(n:Decl) { return this.visitStmt(n); }

        public visitGlobalDef(n:GlobalDef) { return this.visitDecl(n); }
        public visitLibraryRef(n:LibraryRef) { return this.visitDecl(n); }
        public visitRecordDef(n:RecordDef) { return this.visitDecl(n); }
        public visitSingletonDef(n:SingletonDef) { return this.visitDecl(n); }
        public visitAction(n:Action) { return this.visitDecl(n); }
        public visitLocalDef(n:LocalDef) { return this.visitDecl(n); }
        public visitApp(n:App) { return this.visitDecl(n); }

        public visitKindBinding(n:KindBinding) { return this.visitStmt(n); }
        public visitActionBinding(n:ActionBinding) { return this.visitStmt(n); }
        public visitResolveClause(n:ResolveClause) { return this.visitStmt(n); }

        public visitRecordField(n:RecordField) { return this.visitStmt(n); }
        public visitFieldName(n: AST.FieldName) { return this.visitLiteral(n); }
        public visitRecordName(n: AST.RecordName) { return this.visitLiteral(n); }
        public visitInlineStmt(n: AST.InlineStmt) { return this.visitStmt(n); }

        public dispatch(n:AstNode) { return n.accept(this); }

        public visitChildren(n:AstNode)
        {
            n.children().forEach((c) => c.accept(this));
        }
    }

    class SearchForStableName
        extends AST.NodeVisitor
    {
        public found: AST.AstNode;

        constructor(public name: string)
        {
            super()
        }

        visitStmt(s:AST.Stmt)
        {
            if (s.getStableName() == this.name)
                this.found = s;
            this.visitChildren(s);
        }
    }

    class SearchForId
        extends AST.NodeVisitor
    {
        public foundNode:AST.AstNode;
        public lastDecl:AST.Decl;
        public lastStmt:AST.Stmt;

        constructor(public id:string)
        {
            super()
        }

        check(n:AST.AstNode)
        {
            if (n.stableId == this.id)
                this.foundNode = n;
        }

        visitDecl(d:AST.Decl)
        {
            this.check(d);
            if (!this.foundNode) {
                this.lastDecl = d;
                this.visitChildren(d);
            }
            return null;
        }

        visitExprHolder(eh:AST.ExprHolder)
        {
            if (eh.parsed) this.dispatch(eh.parsed)
            this.visitAstNode(eh)
        }

        visitAstNode(n:AST.AstNode)
        {
            this.check(n);
            this.visitChildren(n)
        }

        visitStmt(s:AST.Stmt)
        {
            if (!this.foundNode) {
                this.lastStmt = s;
                this.check(s);
                this.visitChildren(s);
            }
            return null;
        }
    }

    export class StatsComputer
        extends NodeVisitor
    {
        stmtCount = 0;
        weight = 0;
        action:Action;

        constructor() { super() }

        visitAction(n:Action)
        {
            this.action = n;
            this.visitChildren(n);

            if (n.isPage()) this.weight = 2;
            else if (n.isEvent()) this.weight = 1;
            else if (n.isPrivate) this.weight = 0;
            else if (n.isMainAction()) this.weight = 4;
            else this.weight = 3;

            return null
        }

        visitBlock(b:Block)
        {
            this.visitChildren(b);
            return null
        }

        visitStmt(s:Stmt)
        {
            if (!s.isPlaceholder())
                this.stmtCount++;
            this.visitChildren(s);

            return null
        }
    }

    export class StackOp
    {
        public type:string;
        public infixProperty:IProperty;
        public propertyRef:PropertyRef;
        public tokens:Token[];
        public op:string;
        public expr:Expr = null;
        public beg = 0;
        public len = 0;

        public prioOverride:number = 0;

        public prio()
        {
            if (this.prioOverride != 0) return this.prioOverride;
            if (!this.infixProperty) return 0;
            return this.infixProperty.getInfixPriority();
        }

        public markError(msg:string)
        {
            var i = this.beg;
            if (i < 0 || i >= this.tokens.length)
                i = this.tokens.length - 1;
            var end = i + this.len;
            if (end <= i || end > this.tokens.length)
                end = this.tokens.length;
            while (i < end) {
                this.tokens[i].setError(msg);
                i++;
            }
        }

        public copyFrom(other:StackOp)
        {
            this.tokens = other.tokens;
            this.beg = other.beg;
            this.len = other.len;
        }
    }

    export class VariableFinder
        extends NodeVisitor
    {
        private readLocals0:LocalDef[];
        private writtenLocals0:LocalDef[];
        readLocals:LocalDef[];
        writtenLocals:LocalDef[];

        // globals read or written, including both global variables and records
        readGlobals: Decl[];
        writtenGlobals: Decl[];

        visitedActions: Action[];

        getGlobals: boolean = false;

        add(l:Decl, lst:LocalDef[])
        {
            if (l instanceof LocalDef && lst.indexOf(<LocalDef>l) < 0)
                lst.push(<LocalDef>l);
        }

        private getLocal(e:Token):LocalDef
        {
            if (e instanceof ThingRef) {
                var d = (<ThingRef>e).def;
                if (d instanceof LocalDef) return <LocalDef>d;
            }

            return null;
        }

        static realName(g: Decl) {
            return "$" + g.getStableName();
        }

        public writtenGlobalNames(): string[] {
            return this.writtenGlobals.map(VariableFinder.realName);
        }

        public readGlobalNames(): string[] {
            return this.readGlobals.map(VariableFinder.realName);
        }

        addGlobal(l: Decl, lst:Decl[])
        {
            if (lst.indexOf(l) < 0) lst.push(l);
        }

        private getGlobal(e:AstNode)
        {
            if (e instanceof Call) {
                var prop = (<Call>e).prop();
                if (prop instanceof GlobalDef || prop instanceof RecordDef) return <PropertyDecl><any>prop;
            }
            return null;
        }



        visitAstNode(n:AstNode)
        {
            this.visitChildren(n);
            return null;
        }

        visitAction(n: Action) {
            if (this.visitedActions && this.visitedActions.indexOf(n) < 0) {
                this.visitedActions.push(n);
                super.visitAction(n);
            }
        }

        visitThingRef(n:ThingRef)
        {
            this.add(n.def, this.readLocals0);
            return null;
        }

        visitCall(n: Call) {

            var prop = n.prop();

            if (prop == api.core.AssignmentProp) {
                n.args[0].flatten(api.core.TupleProp).forEach((e) => {
                    var l = this.getLocal(e);
                    if (l) this.add(l, this.writtenLocals0);
                    else if (this.getGlobals) {
                        var g = this.getGlobal(e);
                        if (g) this.addGlobal(g, this.writtenGlobals);
                        else this.dispatch(e);
                    } else this.dispatch(e);
                });
                this.dispatch(n.args[1]);
            } else if (this.getGlobals) {
                var act = n.calledAction();
                if (act && this.visitedActions && this.visitedActions.indexOf(act) < 0) {
                    var readLocals0 = this.readLocals0;
                    var writtenLocals0 = this.writtenLocals0;
                    var readLocals = this.readLocals;
                    var writtenLocals = this.writtenLocals;

                    var readGlobals = this.readGlobals;
                    var writtenGlobals = this.writtenGlobals;
                    this.traverse(act, true, this.visitedActions);
                    readGlobals.forEach((g) => this.addGlobal(g, this.readGlobals));
                    writtenGlobals.forEach((g) => this.addGlobal(g, this.writtenGlobals));
                    this.readLocals0 = readLocals0;
                    this.writtenLocals0 = writtenLocals0;
                    this.readLocals = readLocals;
                    this.writtenLocals = writtenLocals;
                }
                if (prop instanceof GlobalDef) {
                    this.addGlobal(<GlobalDef>prop, this.readGlobals);
                    this.addGlobal(<GlobalDef>prop, this.writtenGlobals);
                } else if (prop instanceof RecordDef) {
                    // consider record access as both read and write.
                    // Will differentiate them in the future
                    this.addGlobal(<RecordDef>prop, this.readGlobals);
                    this.addGlobal(<RecordDef>prop, this.writtenGlobals);
                } else {
                    super.visitCall(n);
                }
            } else {
                super.visitCall(n);
            }
            return null;
        }

        visitInlineAction(n:InlineAction)
        {
            n.inParameters.forEach(i => this.add(i, this.writtenLocals))
            super.visitInlineAction(n)
        }

        visitExprHolder(n:ExprHolder)
        {
            this.readLocals0 = [];
            this.writtenLocals0 = [];

            if (n.parsed)
                this.dispatch(n.parsed);

            // maybe there were syntax errors? also look at the raw tokens just in case
            n.tokens.forEach((t) => {
                var l = this.getLocal(t);
                if (l && this.readLocals0.indexOf(l) < 0 && this.writtenLocals0.indexOf(l) < 0)
                    this.add(l, this.readLocals0);
            });

            this.readLocals0.forEach((l) => this.add(l, this.readLocals));
            this.writtenLocals0.forEach((l) => this.add(l, this.writtenLocals));
            return null;
        }

        visitFor(n:For)
        {
            this.add(n.boundLocal, this.writtenLocals);
            super.visitFor(n);
            return null;
        }

        visitForeach(n:Foreach)
        {
            this.add(n.boundLocal, this.writtenLocals);
            super.visitForeach(n);
            return null;
        }

        traverse(node: AstNode, getGlobals: boolean = false, visitedActions: Action[] = []) {
            this.readLocals = [];
            this.writtenLocals = [];
            this.getGlobals = getGlobals;
            if (getGlobals) {
                this.readGlobals = [];
                this.writtenGlobals = [];
                this.visitedActions = visitedActions;
            }
            this.dispatch(node);
        }
    }

    export class Extractor
        extends VariableFinder
    {
        extractedAction:Action;
        numAwait = 0;

        constructor(public extracted:CodeBlock, public action:Action, public callPlaceholder:ExprStmt, public name:string)
        {
            super();
        }

        visitCall(c:Call)
        {
            super.visitCall(c)
            if (c.awaits())
                this.numAwait++;
        }

        run()
        {
            this.traverse(this.extracted);
            var hasAwait = this.numAwait > 0;
            var readSub = this.readLocals;
            var writtenSub = this.writtenLocals;
            this.traverse(this.action.body);

            this.action.getInParameters().forEach((p) => this.add(p.local, this.writtenLocals));
            if (this.action.modelParameter)
                this.add(this.action.modelParameter.local, this.writtenLocals)
            this.action.getOutParameters().forEach((p) => this.add(p.local, this.readLocals));

            var outgoing = writtenSub.filter((l) => this.readLocals.indexOf(l) >= 0);
            var incoming = readSub.filter((l) => this.writtenLocals.indexOf(l) >= 0);

            var refLocal = (l:LocalDef) => mkThing(l.getName());
            var copyNames:any = {}
            var extractedStmts = this.extracted.stmts.slice(0);
            var extractedAction = <Action>Parser.parseDecl("action go() { meta private; }");
            extractedAction.setName(this.name);
            extractedAction.body = this.extracted;
            extractedAction.isAtomic = !hasAwait;
            extractedAction.header.inParameters.pushRange(incoming.map((l) => new ActionParameter(l)));
            outgoing.forEach((l) => {
                if (incoming.indexOf(l) >= 0) {
                    var copy = mkLocal(this.action.nameLocal(l.getName(), copyNames), l.getKind());
                    copyNames[copy.getName()] = true;
                    var stmt = Parser.emptyExprStmt();
                    stmt.expr.tokens = [refLocal(copy), mkOp(":="), refLocal(l)];
                    extractedStmts.push(stmt);
                    l = copy;
                }
                extractedAction.header.outParameters.push(new ActionParameter(l));
            });
            this.extracted.setChildren(extractedStmts);

            var res = Parser.parseDecl(extractedAction.serialize());
            this.extractedAction = <Action>res;

            var toks = this.callPlaceholder.expr.tokens;
            if (outgoing.length > 0) {
                outgoing.forEach((l, i) => {
                    if (i > 0) toks.push(mkOp(","));
                    toks.push(refLocal(l));
                });
                toks.push(mkOp(":="));
            }

            toks.push(mkThing("code"));
            toks.push(mkPropRef(this.name));

            if (incoming.length > 0) {
                toks.push(mkOp("("));
                incoming.forEach((l, i) => {
                    if (i > 0) toks.push(mkOp(","));
                    toks.push(refLocal(l));
                });
                toks.push(mkOp(")"));
            }
        }
    }

    // Find out what methods are called (transitively) from the node
    export class MethodFinder
        extends NodeVisitor
    {
        called: Action[];

        visitAstNode(n: AstNode) {
            this.visitChildren(n);
            return null;
        }

        visitCall(n: Call) {
            var act = n.calledAction();
            if (act && this.called.indexOf(act) < 0) {
                this.called.push(act);
                // scan the called action
                this.traverse(act, this.called);
            }
            super.visitCall(n);
        }

        visitExprHolder(n: ExprHolder) {
            if (n.parsed) this.dispatch(n.parsed);
        }

        traverse(node: AstNode, called: Action[] = []) {
            this.called = called;
            this.dispatch(node);
        }
    }


    // remove comments, skip statments, useless meta
    // used for loose script equality
    export class ScriptCompacter
        extends TDev.AST.NodeVisitor
    {
        constructor () {
            super()
        }

        static compact(s: App) {
            s.setMeta("stableNames", null);
            s.accept(new ScriptCompacter());
            return s;
        }

        visitDecl(d: AST.Decl) {
            this.visitChildren(d);
            return null;
        }

        visitAction(n: TDev.AST.Action) {
            this.visitChildren(n);
            return null
        }

        visitBlock(n: TDev.AST.Block) {
            n.stmts = n.stmts.filter((s) => s.nodeType() != "comment" && !s.isPlaceholder());
            this.visitChildren(n);
        }

        visitStmt(s:TDev.AST.Stmt)
        {
            this.visitChildren(s);
            return null
        }
    }

    export class DeepVisitor
        extends TDev.AST.NodeVisitor
    {
        includeUnreachable = false;
        localActions:Action[] = [];
        libActions:LibraryRefAction[] = [];

        useBuiltinProperty(p:IProperty)
        {
        }

        useKind(k:Kind)
        {
        }

        private useAction(a:Action)
        {
            if (!a) return;
            if (a.visitorState) return;
            a.visitorState = true;

            if (a instanceof LibraryRefAction) {
                this.libActions.push(<LibraryRefAction>a);
            } else {
                this.localActions.push(a);
            }
        }

        static clearVisitorState(app:App)
        {
            app.libraries().forEach((l) => {
                var pubs = l.getPublicActions();
                if (pubs)
                    pubs.forEach((a) => a.visitorState = null);
                if (l.resolved)
                    l.resolved.things.forEach((a) => a.visitorState = null)
            })
            app.things.forEach((a) => a.visitorState = null)
        }

        visitAstNode(n:AstNode)
        {
            super.visitChildren(n);
        }

        visitGlobalDef(g:GlobalDef)
        {
            this.useKind(g.getKind())
        }

        visitRecordField(rf:RecordField)
        {
            this.useKind(rf.dataKind)
        }

        runOnDecl(d:Decl)
        {
            if (d.visitorState) return;
            if (d instanceof Action) this.useAction(<Action>d);
            else {
                d.visitorState = true;
                this.dispatch(d);
            }
        }

        visitRecordDef(r:RecordDef)
        {
            this.useKind(r.entryKind);
            super.visitChildren(r);
        }

        visitPropertyRef(n:PropertyRef)
        {
            var p = n.prop
            if (!p) return;
            var d = p.forwardsTo();

            if (d) {
                this.runOnDecl(d);
            } else {
                this.useBuiltinProperty(p);
            }
        }

        visitActionParameter(ap:ActionParameter)
        {
            this.useKind(ap.getKind());
            super.visitChildren(ap);
        }


        visitAction(a:Action)
        {
            super.visitChildren(a);
        }

        private traverseActions()
        {
            while (this.localActions.length > 0) {
                var a = this.localActions.pop();
                this.dispatch(a);
            }
        }

        private findActionMapping(app:App)
        {
            app.libraries().forEach((l) => {
                if (!l.resolved) return;
                var acts = this.libActions.filter((a) => a.parentLibrary() == l);
                if (acts.length == 0) return;
                var names = {}
                acts.forEach((a) => names[a.getName()] = true)

                l.resolved.allActions().forEach((a) => {
                    if (names.hasOwnProperty(a.getName()))
                        this.useAction(a);
                });
            });
        }

        run(app: App)
        {
            DeepVisitor.clearVisitorState(app);

            app.libraries().forEach((l) => {
                l.resolveClauses.forEach((r:ResolveClause) => {
                    r.actionBindings.forEach((b:Binding) => {
                        if (b instanceof ActionBinding) {
                            this.useAction((<ActionBinding>b).actual);
                        }
                    });
                });
            });


            if (this.includeUnreachable)
                app.things.forEach((d) => this.runOnDecl(d))
            else
                app.allActions().forEach((a:Action) => {
                    if (a.isEvent() || !a.isPrivate)
                        this.useAction(a);
                })


            this.traverseActions();

            if (this.includeUnreachable) {
                app.libraries().forEach((l) => {
                    if (!l.resolved) return;
                    l.resolved.things.forEach((d) => this.runOnDecl(d))
                });
            } else {
                this.findActionMapping(app);
            }

            this.traverseActions();
        }
    }

    export class PlatformDetector
        extends DeepVisitor
    {
        propsByName:any = {};
        featuresByName:any = {};
        errors = "";
        platform:PlatformCapability = PlatformCapability.None;
        requiredPlatform:PlatformCapability = PlatformCapability.All;
        compatMode = true;

        useBuiltinProperty(p:IProperty)
        {
            var n = p.parentKind.toString() + "->" + p.getName();

            if (this.propsByName[n]) return;
            this.propsByName[n] = p;

            var plat = this.compatMode ? p.getExplicitCapability() : p.getCapability();
            if (p.parentKind.toString() == "Invalid")
                plat = PlatformCapability.None;
            this.useFeature(plat, n)
        }

        useKind(k:Kind)
        {
            // just using these types doesn't necessarily mean you're using caps
            // for compat with C# parser
            if (!this.compatMode)
                this.useFeature(k.generalCapabilities, "type " + k.getName())
        }

        usePlatform(plat:PlatformCapability, name:string)
        {
            this.platform |= plat;
            if ((plat & this.requiredPlatform) != plat) {
                this.errors += name + " is not supported on this platform.\n";
            }
        }

        useFeature(plat:PlatformCapability, name:string)
        {
            if (this.featuresByName[name]) return;
            this.featuresByName[name] = true;
            this.usePlatform(plat, name);
        }

        visitAction(a:Action)
        {
            super.visitAction(a);
            if (a.isEvent())
                this.useFeature(a.eventInfo.type.platform, a.getName())
        }

        visitRecordDef(r: RecordDef) {
            if (r.cloudEnabled)
                this.useFeature(PlatformCapability.CloudData, "cloud records")
        }

        visitApp(a:App)
        {
            super.visitApp(a)
        }
    }

    export class DeclRefFinder
        extends NodeVisitor
    {
        public found = false;

        constructor(public decl:Decl)
        {
            super();
        }

        visitAstNode(n:AstNode)
        {
            if (this.found) return;

            this.visitChildren(n);
        }

        visitToken(t:Token)
        {
            this.found = this.found || t.matches(this.decl);
        }
    }

    export class ExprVisitor
        extends NodeVisitor
    {
        visitAstNode(n:AstNode)
        {
            this.visitChildren(n);
        }

        visitExprHolder(eh:ExprHolder)
        {
            if (eh.parsed) this.dispatch(eh.parsed)
        }
    }

    export class ShallowMethodFinder
        extends ExprVisitor
    {
        called: Action[] = [];

        visitCall(n: Call) {
            var act = n.calledAction();
            if (act && this.called.indexOf(act) < 0)
                this.called.push(act);
            super.visitCall(n);
        }
    }

    class StmtVisitor
        extends NodeVisitor
    {
        constructor(public f:(s:Stmt)=>void)
        {
            super()
        }

        visitStmt(s:Stmt)
        {
            this.f(s)
            this.visitChildren(s)
        }
    }

    export function visitStmts(s:Stmt, f:(s:Stmt)=>void)
    {
        var v = new StmtVisitor(f)
        v.dispatch(s)
    }

    export function visitExprHolders(s:Stmt, f:(stmt:Stmt, eh:ExprHolder)=>void)
    {
        visitStmts(s, stmt => {
            if (stmt.calcNode()) f(stmt, stmt.calcNode())
        })
    }

    class AllNodeVisitor
        extends NodeVisitor
    {
        constructor(private f:(s:AstNode)=>void)
        {
            super()
        }

        visitAstNode(n:AstNode)
        {
            this.f(n)
            this.visitChildren(n);
        }

        visitExprHolder(eh:ExprHolder)
        {
            this.f(eh)
            if (eh.parsed) this.dispatch(eh.parsed)
            this.visitChildren(eh)
        }
    }


    export function visitNodes(s:Stmt, f:(s:AstNode)=>void)
    {
        var v = new AllNodeVisitor(f)
        v.dispatch(s)
    }

    export interface LoopStmt {
        body: CodeBlock;
    }


    export interface LoadScriptResult
    {
        numErrors:number;
        status:string;
        parseErrs: string[];
        errLibs:App[];
        prevScript:App;
        numLibErrors:number;
    }


    export function loadScriptAsync(getText:(s:string)=>Promise, currentId = ""):Promise
    {
        var rp = new PromiseInv();
        var res:LoadScriptResult = { numErrors: 0, status: "", parseErrs: [], errLibs: [], prevScript: Script, numLibErrors: 0 }

        var problem = (msg) => {
            res.numErrors++;
            res.status += "    " + msg + "\n";
        }

        getText(currentId).done((text) => {
            if (!text) return;

            var app = Parser.parseScript(text, res.parseErrs);
            var byId:any = {}
            app.libraries().forEach((lib) => {
                var id = lib.getId();
                if (id) byId[id] = getText(id);
            })
            Promise.join(byId).then((byId) => {
                res.prevScript = Script;
                setGlobalScript(app);
                Script.isTopLevel = true;
                var prevPlatform = Script.getPlatformRaw();
                if (prevPlatform & PlatformCapability.Current)
                    Script.setPlatform(PlatformCapability.All);
                Script.localGuid = Util.guidGen();
                if (res.parseErrs.length > 0)
                    problem("Parse errors");
                var resolved = {}
                var errLibs = []
                var hasEmptyLib = false;
                Script.libraries().forEach((lib) => {
                    var id = lib.getId()
                    if (!id) {
                        lib.setError("TD131: unbound library")
                        problem("Library '" + lib.getName() + "' is unbound");
                        res.numLibErrors++;
                        return;
                    } else if (id == "sixvorgj") {
                        hasEmptyLib = true;
                    }

                    if (!resolved[id] && byId[id]) {
                        var libParseErrs = [];
                        var app = Parser.parseScript(byId[id], libParseErrs);
                        app.isTopLevel = true;
                        if (libParseErrs.length > 0)
                            problem("Parse errors in library " + id);
                        if (lib.guid) app.localGuid = lib.guid;
                        app.setPlatform(PlatformCapability.All);
                        var numErr = TypeChecker.tcScript(app, true);
                        if (numErr > 0) {
                            problem("Library " + id + " has errors");
                            res.numLibErrors++;
                            res.errLibs.push(app);
                        }
                        resolved[id] = app;
                    }

                    if (resolved[id]) {
                        lib.resolved = resolved[id];
                    } else {
                        lib.setError("TD132: cannot bind library")
                        res.numLibErrors++;
                        problem("Library " + id + " not provided");
                    }
                });

                TypeChecker.tcScript(Script, false, false);
                Script.setStableNames();

                Script.things.forEach((th) => {
                    if (th.hasErrors())
                        problem("Declaration '" + th.getName() + "' has errors");
                })
                Script.setPlatform(prevPlatform);

                if (res.numErrors && hasEmptyLib)
                    res.numLibErrors++;

                rp.success(res);
            }, rp.error).done(x => x, rp.error);
        }, rp.error)

        return rp;
    }

    class ErrorChecker
        extends NodeVisitor
    {
        lastErrorNode:AstNode;
        surplusErrors = 0;
        mismatches = 0;
        missingErrors = 0;
        matches = 0;

        resetError()
        {
            if (this.lastErrorNode)
                this.surplusErrors++;
            this.lastErrorNode = null;
        }

        expectError(node:Stmt, rx:string)
        {
            if (this.lastErrorNode) {
                var err = this.lastErrorNode.getError();
                if (new RegExp(rx).test(err)) {
                    this.lastErrorNode.errorIsOk = true;
                    this.matches++;
                } else {
                    this.mismatches++;
                    node.setError("TD133: the error message doesn't match")
                }
                this.lastErrorNode = null;
            } else {
                this.missingErrors++;
                node.setError("TD134: no error to match")
            }
        }

        visitComment(n:Comment)
        {
            n.errorIsOk = false;
            var m = /^E: (.*)/.exec(n.text)
            if (m) {
                this.expectError(n, m[1]);
            } else {
                super.visitComment(n);
            }
        }

        visitBlock(n:Block)
        {
            // no resetError()
            n.errorIsOk = false;
            this.visitChildren(n);
        }

        visitStmt(n:Stmt)
        {
            n.errorIsOk = false;
            if (n.parent instanceof CodeBlock || n.getError())
                this.resetError();
            if (n.getError())
                this.lastErrorNode = n;
            this.visitChildren(n);
        }

        visitDecl(d:Decl)
        {
            this.resetError();
            if (d.getError())
                this.lastErrorNode = d;
            this.visitChildren(d);
            this.resetError();
        }
    }

    export function runErrorChecker(a:Action): boolean
    {
        var e = new ErrorChecker();
        e.dispatch(a);
        return e.surplusErrors + e.mismatches + e.missingErrors == 0;
    }

    export class FindErrorVisitor extends NodeVisitor
    {
        firstError:Stmt;
        public visitStmt(s:Stmt)
        {
            if (this.firstError) return;
            if (s.getError()) this.firstError = s
            else this.visitChildren(s)
        }
        public visitDecl(d:Decl) { this.visitChildren(d) }

        static run(n:AstNode)
        {
            var vis = new FindErrorVisitor()
            vis.dispatch(n)
            return vis.firstError
        }
    }

    class IntelliCollector extends NodeVisitor
    {
        props:any = {};

        public visitAstNode(n:AstNode) {
            this.visitChildren(n);
        }

        public visitAction(a:Action)
        {
            if (a._skipIntelliProfile)
                return
            this.visitChildren(a);
        }

        private incr(n:string)
        {
            if (!n) return;
            if (!this.props.hasOwnProperty(n))
                this.props[n] = 0;
            this.props[n]++;
        }

        public visitExprHolder(eh:ExprHolder)
        {
            if (eh.parsed)
                this.dispatch(eh.parsed)
        }

        public visitCall(c:Call)
        {
            if (c.prop())
                this.incr(c.prop().usageKey())
            this.visitChildren(c);
        }

        public visitThingRef(t:ThingRef)
        {
            if (t.def)
                this.incr(t.def.usageKey())
        }

        public visitComment(c:Comment)
        {
            var dummy = c.text.replace(/#allow:(\w+)/, (match:string, feature:string) => {
                this.incr(feature)
                return ""
            })
            // usage of comments does not imply that they are allowed so no super call

            var dummy2 = c.text.replace(/\{widgets:([\w,]*)\}/, (match:string, features:string) => {
                this.incr("tutorialWidgets");
                features.split(',').forEach(feature => this.incr(feature));
                return ""
            })

            var dummy2 = c.text.replace(/\{flags:([\w,]*)\}/, (match:string, features:string) => {
                this.incr("tutorialFlags");
                features.split(',').forEach(feature => this.incr("flag:" + feature));
                return ""
            })
        }

        public visitExprStmt(e:ExprStmt)
        {
            if (e.isVarDef()) this.incr("var");
            super.visitExprStmt(e);
        }

        public visitStmt(s:Stmt)
        {
            if (!(s instanceof App))
                this.incr(s.nodeType())
            super.visitStmt(s)
        }
    }

    export class IntelliProfile
    {
        public allowAllLibraries : boolean = true;
        private properties:any; // p.helpTopic() => #occurences

        public merge(other : IntelliProfile)
        {
            this.allowAllLibraries = this.allowAllLibraries && other.allowAllLibraries;
            if (other.properties) {
                if (!this.properties) this.properties = Util.clone(other.properties);
                else Object.keys(other.properties).forEach(k => {
                    if (this.properties[k]) this.properties[k] += other.properties[k];
                    else this.properties[k] = other.properties[k];
                });
            }
        }

        static helpfulProperties = {
            ColorsBlack: 1,
            ColorsBlue: 1,
            ColorsCyan: 1,
            ColorsGreen: 1,
            ColorsMagenta: 1,
            ColorsOrange: 1,
            ColorsPurple: 1,
            ColorsRed: 1,
            ColorsWhite: 1,
            ColorsYellow: 1,
            ColorsPink: 1,
            //ColorsSepia: 1,
            //ColorsBrown: 1,
        }

        public hasKey(k:string)
        {
            if (!k) return true;
            return !this.properties || !!this.properties[k.toLowerCase()]
        }

        public hasTokenUsage(p:any)
        {
            if (!p) return true;
            var tok:TokenUsage = p.getUsage ? p.getUsage() : null;
            return tok && tok.localCount + tok.globalCount > 0;
        }

        public hasProperty(p:IProperty)
        {
            if (!this.properties) return true;
            return this.hasTokenUsage(p) || this.hasKey(p.usageKey()) || (this.allowAllLibraries && p instanceof LibraryRefAction);
        }

        public hasDecl(p:Decl)
        {
            if (!this.properties) return true;
            if (p.getName() == AST.libSymbol)
                // needs explicit #allow:libSingleton
                return this.hasKey("libSingleton");
            return this.hasTokenUsage(p) || this.hasKey(p.usageKey());
        }

        public incr(k:string)
        {
            if (!this.properties) return

            k = k.toLowerCase();
            if (this.properties.hasOwnProperty(k)) this.properties[k]++
            else this.properties[k] = 1
        }

        public loadFrom(node:AstNode, builtin : boolean)
        {
            var v = new IntelliCollector()
            v.props = builtin ? Util.clone(IntelliProfile.helpfulProperties) : {};
            v.dispatch(node)
            this.properties = {}
            Object.keys(v.props).forEach(k => {
                this.properties[k.toLowerCase()] = v.props[k]
            })
        }
    }

    export class AtomicVisitor
        extends ExprVisitor
    {
        private calls:StringMap<Set<Action>> = {}
        private currentAction:Action;
        private currentCalls:Set<Action>;
        private numNonAtomic:number;
        private nonAtomic = new Set<Action>();

        visitCall(c:Call)
        {
            var act = c.calledAction() || c.calledExtensionAction()

            if (act && !act.isInLibrary()) {
                if (act.isPage()) this.numNonAtomic++;
                else this.currentCalls.add(act)
            } else {
                if (c.prop().getFlags() & PropertyFlags.Async)
                    this.numNonAtomic++;
            }

            super.visitCall(c)
        }

        visitInlineAction(a:InlineAction)
        {
            // skip body
        }

        visitAction(a:Action)
        {
            if (a.isPage() || a.isEvent())
                this.nonAtomic.add(a)

            if (a.isActionTypeDef() || a.isAtomic)
                return;

            this.currentAction = a;
            this.currentCalls = new Set<Action>();
            this.calls[a.getName()] = this.currentCalls;
            this.numNonAtomic = 0;
            super.visitAction(a);
            if (this.numNonAtomic > 0)
                this.nonAtomic.add(a)
        }

        static run(app:App)
        {
            var v = new AtomicVisitor()
            v.dispatch(app)
            var nonAtomic = v.nonAtomic;
            while (true) {
                var prev = nonAtomic.length()
                app.actions().forEach(a => {
                    if (nonAtomic.contains(a) || !v.calls.hasOwnProperty(a.getName())) return
                    if (v.calls[a.getName()].elts().some(x => nonAtomic.contains(x)))
                        nonAtomic.add(a)
                })
                if (prev == nonAtomic.length()) break;
            }
            return app.actions().filter(a => !nonAtomic.contains(a))
        }
    }

    export class InitIdVisitor extends NodeVisitor {
        private expectAllSet = false;
        private unsetNodes:AstNode[];
        private lastStmt:Stmt;
        private usedIds:StringMap<AstNode> = {};

        constructor(private refresh:boolean) {
            super();
        }

        public expectSet(n:AstNode)
        {
            this.expectAllSet = true
            this.unsetNodes = []
            this.usedIds = {}
            this.dispatch(n)
            if (this.unsetNodes.length > 0) {
                var dict = Util.toDictionary(this.unsetNodes, (n:AstNode) => n.nodeType())
                Util.oops("id not set on " + Object.keys(dict).join(", "))
            }
        }

        // these don't need IDs
        public visitAstNode(node:AstNode):any {  }
        public visitToken(tok:Token) {  }
        public visitOperator(n:Operator) {  }
        public visitPropertyRef(n:PropertyRef) {  }
        public visitExpr(tok:Expr) {  }
        public visitLiteral(n:Literal) {  }
        public visitThingRef(n:ThingRef) {  }
        public visitCall(n:Call) {  }

        public visitExprHolder(eh:ExprHolder)
        {
            var n = this.lastStmt
            var ai = eh.assignmentInfo()
            if (ai)
                ai.definedVars.forEach((x, i) => x.setStableName(n.getStableName() + "$l" + i));
        }

        // Stmt and subclasses need IDs
        public visitStmt(n:Stmt) {
            if (this.expectAllSet && !n.getStableName() && !n.isPlaceholder())
                this.unsetNodes.push(n)
            n.initStableName(this.refresh);

            if (!this.refresh) {
                var u = this.usedIds
                var nn = n.getStableName()
                if (u.hasOwnProperty(nn) && u[nn] != n) {
                    n.initStableName(true)
                } else u[nn] = n
            }
        }
        public visitBlock(n:Block) {
            this.visitStmt(n);

            /*var ch = n.children()
            if (ch.length == 1 && ch[0].isPlaceholder())
                // TODO XXX - this is a hack to give deterministic IDs to
                // the auto-generated empty (skip) statements in new actions, etc.
                this.deriveIdChildren(n)
            else*/
                this.visitChildren(n)
        }

        public visitChStmt(n:Stmt)
        {
            this.visitStmt(n)
            this.deriveIdChildren(n)
        }

        private withBoundLocal(n:Stmt, loc:LocalDef)
        {
            this.visitChStmt(n)
            if (loc)
                loc.setStableName(n.getStableName() + "$l0")
        }

        public visitFor(n:For)                      { this.withBoundLocal(n, n.boundLocal); }
        public visitForeach(n:Foreach)              { this.withBoundLocal(n, n.boundLocal); }
        public visitWhile(n:While)                  { this.visitChStmt(n); }
        public visitBox(n:Box)                      { this.visitChStmt(n); }
        public visitAnyIf(n:If)                     { this.visitChStmt(n); }
        public visitInlineActions(n:InlineActions)  { this.visitChStmt(n); }
        public visitActionHeader(n:ActionHeader)    { this.visitChStmt(n); }
        public visitExprStmt(n:ExprStmt)            { this.visitChStmt(n); }

        public visitActionParameter(n:ActionParameter) { this.withBoundLocal(n, n.local) }

        public visitInlineAction(n:InlineAction)
        {
            this.withBoundLocal(n, n.name);
            n.inParameters.forEach((p, i) => p.setStableName(n.getStableName() + "$inlIn" + i))
            n.outParameters.forEach((p, i) => p.setStableName(n.getStableName() + "$inlOut" + i))
        }


        public visitGlobalDef(n:GlobalDef)      { this.visitChStmt(n); }
        public visitRecordDef(n:RecordDef)      { this.visitChStmt(n); }
        public visitAction(n:Action)            { this.visitChStmt(n); }

        public visitLibraryRef(n:LibraryRef)
        {
            this.visitChStmt(n);
            //n.getPublicActions().forEach(e => this.dispatch(e))
        }

        public visitLocalDef(n:LocalDef)           { }

        public visitApp(n:App)                     { this.visitDecl(n); this.visitChildren(n); }
        public visitKindBinding(n:KindBinding)     {
            if (n.isExplicit)
                this.visitStmt(n);
        }
        public visitActionBinding(n:ActionBinding) {
            if (n.isExplicit)
                this.visitStmt(n);
        }
        public visitResolveClause(n:ResolveClause) { this.visitChStmt(n); }
        public visitRecordField(n:RecordField)     { this.visitChStmt(n); }

        public visitChildren(n:AstNode)
        {
            n.children().forEach(c => { if (c) c.accept(this); });
        }

        public deriveIdChildren(n:Stmt) {
            this.lastStmt = n;
            n.children().forEach((c, ix) => {
                if(c) {
                    if(c instanceof Stmt) {
                        (<Stmt>c).deriveStableName(n, ix)
                    }
                    c.accept(this);
                }
            });
        }

        static ensureOK(app:App)
        {
            if (app.hasIds)
                new InitIdVisitor(false).dispatch(app)
        }
    }
}
