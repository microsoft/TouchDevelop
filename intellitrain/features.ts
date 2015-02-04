///<reference path='../editor/refs.ts'/>

module TDev.IntelliTrain {

    // compute the top-level goal properties can be null, or a string.
    // Used only during training on Json ASTs.
    // Note: during prediction use in the calculator, there's a different GoalState defined in calculator.ts
    export class GoalState extends AST.Json.NodeVisitor {

        // used during compute
        public localTypes = {};
        public resolver: AST.Json.ScriptResolver;
        public globalOnly: boolean;

        public goalWindow: string[] = [];
        public windowSize = 3;

        public pushGoal(goal: string) {
            if (this.goalWindow.length >= this.windowSize) {
                this.goalWindow.shift();
            }
            this.goalWindow.push(goal);
        }

        /// dispatcher for goal computation

        public compute(expr: AST.Json.JExprStmt): string {
            var goal = this.dispatch(expr.expr.tree);
            if (goal) {

                // if it is a property with non-Nothing return type, use the type.
                var s = goal.split(":", 3);
                if (s[0] == "prop") {
                    var prop = this.resolver.resolveProp(s[1], s[2]);
                    if (prop && prop.result && <any>prop.result.type != "Nothing") {
                        return "a:" + this.resolver.normalizeType(<any>prop.result.type);
                    }
                }
            }
            return goal;
        }

        public visit_stringLiteral(lit: AST.Json.JStringLiteral): any {
            return "a:String";
        }
        public visit_numberLiteral(lit: AST.Json.JNumberLiteral): any {
            return "a:Number";
        }
        public visit_booleanLiteral(lit: AST.Json.JBooleanLiteral): any {
            return "a:Boolean";
        }
        public visit_localRef(local: AST.Json.JLocalRef): any {
            var type = this.localTypes[<any>local.localId];
            if (type) {
                return "a:" + this.resolver.normalizeType(type);
            }
            else {
                throw new Error("local type not found");
            }
        }
        public visit_singletonRef(singleton: AST.Json.JSingletonRef): any {
            // shouldn't be top level
            return this.resolver.normalizeType(<any>singleton.type);
        }

        public visit_call(call: AST.Json.JCall): any {
            if (call.name == ":=") {
                return this.dispatch(call.args[1]);
            }
            if (<any>call.parent == "data") {
                var type = this.resolver.dataType(call.declId);
                return "a:" + this.resolver.normalizeType(type);
            }
            if (call.declId) {
                var action = this.resolver.action(call.declId);
                var resultType;
                var tokenContext;
                if (action && action.outParameters && action.outParameters.length > 0) {
                    return "a:" + this.resolver.normalizeType(<any>action.outParameters[0].type);
                }
                else {
                    return "a:Nothing";
                }
            }
            // top-level property must be the goal.
            return "prop:" + this.resolver.normalizeType(<any>call.parent) + ":" + call.name;
        }


    }

    export class CorrelationCount implements ICorrelation {
        public histoA = new TokenCount();
        public histoB = new TokenCount();
        public correlations: { [a: string]: TokenCount } = {};
        public total = 0;

        private getCount(a: string) {
            var result = this.correlations[a];
            if (!result) {
                result = new TokenCount();
                this.correlations[a] = result;
            }
            return result;
        }
        public countPair(g1: string, g2: string, toAdd = 1) {
            var count = this.getCount(g1);
            count.count(g2, toAdd);
            this.total++;
            this.histoA.count(g1, toAdd);
            this.histoB.count(g2, toAdd);
        }

        public probability(g1: string, g2: string) {
            var count = this.getCount(g1);
            var freq = count[g2];
            if (freq >= 0) {
                return freq / this.total;
            }
            return 0;
        }

        public sortedPrecision(): { aLabel: string; bLabel: string; freq: number; aCount: number; bCount: number }[] {
            var elems: { aLabel: string; bLabel: string; freq: number; aCount: number; bCount: number }[] = [];

            Object.keys(this.correlations).forEach(g1 => {
                var c = this.correlations[g1];
                Object.keys(c.counts).forEach(g2 => {
                    var c1 = this.histoA.counts[g1];
                    var c2 = this.histoB.counts[g2];
                    var cc = c.counts[g2];
                    elems.push({ aLabel: g1, bLabel: g2, freq: cc, aCount: c1, bCount: c2 });
                });
            });
            elems.sort((a, b) => b.freq / b.aCount - a.freq / a.aCount);
            return elems;
        }
    }

    export class GoalCounter {

        public windowCorrelation: CorrelationCount = new CorrelationCount();
        public nestedCorrelation: CorrelationCount = new CorrelationCount();

        public countPair(g1: string, g2: string) {
            this.windowCorrelation.countPair(g1, g2);
        }

        public countNested(g1: string, g2: string, count = 1) {
            this.nestedCorrelation.countPair(g1, g2, count);
        }

        public display(out: Util.IOutput) {
            out.show("Window Correlations");
            out.show("===================");
            this.windowCorrelation.sortedPrecision().forEach(elem =>
                out.show(elem.aLabel + " ==> " + elem.bLabel + " -- precision: " + PredictionEvaluator.percentage(elem.freq, elem.aCount) + "  recall: " + PredictionEvaluator.percentage(elem.freq, elem.bCount)));

            out.show("Nested Correlations");
            out.show("===================");
            this.nestedCorrelation.sortedPrecision().forEach(elem =>
                out.show(elem.aLabel + " ==> " + elem.bLabel + " -- precision: " + PredictionEvaluator.percentage(elem.freq, elem.aCount) + "  recall: " + PredictionEvaluator.percentage(elem.freq, elem.bCount)));

        }

    }

    export class IntelliTracer extends AST.Json.NodeVisitor {

        private localTypes;
        public state: AstState;

        constructor(public observer: ITokenObserver, public apiresolver: AST.Json.IResolver, private globalOnly = true) {
            super();
            this.localTypes = {};
            this.state = new AstState(this.apiresolver, globalOnly);
            this.state.goalState.localTypes = this.localTypes;
        }

        public observe(s: string) {
            // do not observe these
            switch (s) {
                case 'op:(':
                case 'op:)':
                case 'op:,':
                    return;
            }
        }

        private visit_block(context: Cat, b: AST.Json.JStmt[]) {
            //this.state.features.push(Cat.stmt_context, context);
            b.forEach(s => {
                this.dispatch(s)
        });
            //this.state.features.pop(Cat.stmt_context);
        }

        public visit_expression(goalType: string, e: AST.Json.JExprHolder) {
            this.analyzeExprHolder(goalType, e);
        }

        public visit_for(n: AST.Json.JFor) {
            this.visit_localDef(n.index);
            this.visit_expression("a:Boolean", n.bound);

            //this.state.forStack.push(n.index);
            this.visit_block(Cat.for_body, n.body);
            //this.state.forStack.pop();
        }

        public visit_foreach(n: AST.Json.JForeach) {
            this.visit_localDef(n.iterator);
            this.visit_expression("a:Enumerator", n.collection);

            n.conditions.forEach(v => this.dispatch(v));

            //this.state.foreachStack.push(n.iterator);
            this.visit_block(Cat.foreach_body, n.body);
            //this.state.foreachStack.pop();
        }

        public visit_token(tok: AST.Json.JToken) {
            throw "missing token specialization";
        }


        private lastHandlerProp: string[] = [];

        public visit_localDef(local: AST.Json.JLocalDef): any {
            this.localTypes[local.id] = local.type;
        }

        public analyzeExprHolder(goal: string, holder: AST.Json.JExprHolder): any {
            holder.locals.forEach(v => this.visit_localDef(v));
            var tokenState = new TokenState(goal, holder.tokens, this.state.resolver, (id) => this.localTypes[id], this.observer);
            var dist:IFrequencies = {};
            dist[goal] = 1;
            tokenState.analyze(dist);
        }

        public visit_exprStmt(node: AST.Json.JExprStmt): any {
            if (node.expr.tokens.length <= 0) return;
            var goal = this.state.goalState.compute(node);
            if (goal) {
                this.observer.observeGoal(this.state, goal);
                this.state.goalState.pushGoal(goal);
            }
            else {
                // no goal is possible for side-effecting methods. We don't record the method names.
                // for library methods we maybe should do it.
                goal = "a:Nothing";
            }
            this.visit_expression(goal, node.expr);
        }


        public visit_inlineAction(action: AST.Json.JInlineAction): any {
            action.inParameters.forEach(p => this.visit_localDef(p));
            action.outParameters.forEach(p => this.visit_localDef(p));
            var lastHandlerProp = this.lastHandlerProp.peek();
            var savedWindow = this.state.goalState.goalWindow;
            if (lastHandlerProp) {
                this.state.goalState.goalWindow = ["start:" + lastHandlerProp];
            }
            this.visit_block(Cat.handler_body, action.body);
            if (lastHandlerProp) {
                this.state.goalState.goalWindow = savedWindow;
            }
        }
        public visit_inlineActions(actions: AST.Json.JInlineActions): any {
            this.visit_exprStmt(actions);
            var thisGoal = this.state.goalState.compute(actions);
            this.lastHandlerProp.push(thisGoal);
            actions.actions.forEach(a => this.dispatch(a));
            this.lastHandlerProp.pop();
        }
        public visit_boxed(boxed: AST.Json.JBoxed): any {
            this.visit_block(Cat.boxed_body, boxed.body);
        }
        public visit_if(node: AST.Json.JIf): any {
            this.visit_expression("a:Boolean", node.condition);
            this.visit_block(Cat.then_body, node.thenBody);
            if (node.elseBody) {
                this.visit_block(Cat.else_body, node.elseBody);
            }
        }
        public visit_action(action: AST.Json.JAction): any {
            action.inParameters.forEach(i => this.visit_localDef(i));
            action.outParameters.forEach(i => this.visit_localDef(i));
            this.lastHandlerProp.push(null);
            var name = action.name;
            if (name != "main") {
                name = "action";
            }
            this.state.goalState.goalWindow = ["start:" + name];
            this.visit_block(Cat.top, action.body);
            this.lastHandlerProp.pop();
        }
        public visit_comment(comment: AST.Json.JComment): any { return; }

        public visit_while(stmt: AST.Json.JWhile): any {
            this.visit_expression("a:Boolean", stmt.condition);
            this.visit_block(Cat.while_body, stmt.body);
        }
        public visit_where(clause: AST.Json.JWhere): any {
            this.visit_expression("a:Boolean", clause.condition);
        }
        public visit_typeRef(type: AST.Json.JTypeRef): any { }
        public visit_page(p: AST.Json.JPage): any {
            p.inParameters.forEach(i => this.visit_localDef(i));
            p.outParameters.forEach(i => this.visit_localDef(i));

            this.state.goalState.goalWindow = ["start:pageinit"];
            this.visit_block(Cat.top, p.initBody);
            this.state.goalState.goalWindow = ["start:pagebody"];
            this.visit_block(Cat.top, p.displayBody);
        }
        public visit_event(e: AST.Json.JEvent): any {
            e.inParameters.forEach(i => this.visit_localDef(i));
            e.outParameters.forEach(i => this.visit_localDef(i));

            this.state.goalState.goalWindow = ["start:" + e.eventName];
            this.visit_block(Cat.top, e.body);
        }
        public visit_libAction(la: AST.Json.JLibAction): any { }
        public visit_art(art: AST.Json.JArt): any { }
        public visit_data(data: AST.Json.JData): any { }
        public visit_library(lib: AST.Json.JLibrary): any { }
        public visit_typeBinding(type: AST.Json.JTypeBinding): any { }
        public visit_actionBinding(action: AST.Json.JActionBinding): any { }
        public visit_resolveClause(r: AST.Json.JResolveClause): any { }
        public visit_record(r: AST.Json.JRecord): any { }
        public visit_recordField(rf: AST.Json.JRecordField): any { }
        public visit_recordKey(rk: AST.Json.JRecordKey): any { }
        public visit_app(app: AST.Json.JApp): any {
            this.state.resolver.setCurrentScript(app);
            app.decls.forEach(d => this.dispatch(d));
        }
        public visit_propertyParameter(p: AST.Json.JPropertyParameter): any { }
        public visit_property(p: AST.Json.JProperty): any { }
        public visit_typeDef(td: AST.Json.JTypeDef): any { }
        public visit_apis(apis: AST.Json.JApis): any { }

        private script: AST.Json.JApp;

        public visitScript(id: string, finished: () => void) {
            var script = TDev.Util.httpRequestAsync("http://www.touchdevelop.com/api/" + id + "/webast");
            script.done((v) => {
                var rval = JSON.parse(v);
                if (rval) {
                    this.script = rval;
                    this.dispatch(rval);
                }
                finished();
            },
                (e) => { throw e; });

        }

    }

    export class TokenCount implements IHistogram {

        public total = 0;
        // maps tokens to counts based on context
        public counts: IFrequencies = {};

        public count(token: string, toAdd = 1) {
            this.total++;
            if (this.counts[token]) {
                this.counts[token] = toAdd + this.counts[token];
            }
            else {
                this.counts[token] = toAdd;
            }
        }

        public display(out: Util.IOutput) {
            var elems = [];
            Object.keys(this.counts).forEach((label) => {
                elems.push({ key: label, value: this.counts[label] });
            });
            elems.sort((a, b) => b.value - a.value);
            out.vertical(() => {
                var i = 0;
                out.show("Total counts: " + this.total);
                while (i < 50 && i < elems.length) {
                    var elem = elems[i++];
                    out.horizontal(() => {
                        out.show(elem.key);
                        out.show(" : ");
                        out.show(elem.value);
                    })
            }
            });
        }

        public sortedValues(): IKeyValue[] {
            return this.sorted((a, b) => b.value - a.value);
        }
        public sortedKeys(): IKeyValue[] {
            return this.sorted((a, b) => (a.key < b.key) ? -1 : 1);
        }

        public sorted(comp: (a: IKeyValue, b: IKeyValue) => number): { key: string; value: number }[] {
            var elems = [];
            Object.keys(this.counts).forEach((label) => {
                elems.push({ key: label, value: this.counts[label] });
            });
            elems.sort(comp);
            return elems;
        }


    }

    export interface IKeyValue {
        key: string;
        value: number;
    }

    interface IFeatureState {

        featureCat: Cat;
        push(value: any): void;
        pop(): void;
    }


    class FeatureState implements IFeatureState {

        private stack: string[] = [];
        private counts = {};
        private allowed_values = null;
        public feature: string;

        constructor(public featureCat: Cat, allowed: Cat[]= null, private replace: boolean = false, public offset = 1) {
            if (allowed) {
                this.allowed_values = {};
                allowed.forEach(v=> this.allowed_values[v] = true);
            }
            this.feature = Cat[featureCat] + offset;
        }

        public current(): string {
            if (this.stack.length >= this.offset) {
                return this.stack[this.stack.length - this.offset];
            }
            return null;
        }

        public push(value: any) {
            if (this.replace) {
                this.stack = [];
            }
            if (this.allowed_values) {
                if (!this.allowed_values[value]) {
                    throw ("value not allowed: " + value);
                }
                // convert to string
                value = Cat[value];
            }
            this.stack.push(value);
            var current = this.current();
        }

        public pop() {
            this.stack.pop();
        }

        public display(out: Util.IOutput) {
            out.horizontal(() => {
                out.show("Feature " + Cat[this.featureCat] + " offset " + this.offset);
                out.vertical(() => {
                    Object.keys(this.counts).forEach(label => {
                        var v = this.counts[label];
                        if (v instanceof TokenCount) {
                            out.horizontal(() => {
                                out.show("Cat " + label);
                                v.display(out);
                            });
                        }
                    });
                });
            });
        }
    }

    class FeatureStateStack implements IFeatureState {

        constructor(public featureCat: Cat, public depth: number, allowed: Cat[]= null) {
            for (var i = 0; i < depth; i++) {
                var feature = new FeatureState(featureCat, allowed, false, i + 1);
                this[i] = feature;
            }
        }

        public pop() {
            for (var i = 0; i < this.depth; i++) {
                this[i].pop();
            }
        }

        public push(v: any) {
            for (var i = 0; i < this.depth; i++) {
                this[i].push(v);
            }
        }

        public at(i: number): FeatureState {

            return this[i];
        }
    }

    class FeatureStates {
        public features: FeatureState[] = [];

        private register(fs: IFeatureState) {
            if (fs instanceof FeatureStateStack) {
                var fss = <FeatureStateStack>fs;
                for (var i = 0; i < fss.depth; i++) {
                    var f = fss.at(i);
                    this.features.push(f);
                    this[f.feature] = f;
                }
            }
            else if (fs instanceof FeatureState) {
                var pfs = <FeatureState>fs;
                if (pfs.featureCat == Cat.intrinsic) {
                    pfs.push(Cat.all);
                }
                this.features.push(pfs);
                this[pfs.feature] = f;
            }
            else {
            throw "unknown kind of feature state"
        }
            this[fs.featureCat] = fs;

        }

        constructor() {
            this.register(new FeatureState(Cat.intrinsic, [Cat.all]));
            this.register(new FeatureState(Cat.expr_context, [Cat.for_bound, Cat.foreach_collection, Cat.if_cond, Cat.while_cond, Cat.where, Cat.expr_stmt]));
            this.register(new FeatureState(Cat.top_context, [Cat.page_init, Cat.page_body, Cat.action_body, Cat.event_body]));
            this.register(new FeatureState(Cat.token_context, null, true));
            this.register(new FeatureStateStack(Cat.stmt_context, 3, [Cat.top, Cat.then_body, Cat.else_body, Cat.for_body, Cat.foreach_body, Cat.while_body, Cat.handler_body, Cat.boxed_body]));
            this.register(new FeatureStateStack(Cat.prop_context, 2));
            this.register(new FeatureState(Cat.selected_type, null, true));
        }

        public push(feature: Cat, value: any) {
            this[feature].push(value);
        }

        public pop(feature: Cat) {
            this[feature].pop();
        }

        public state(f: string): string {
            var feature = this[f];
            if (feature) {
                return feature.current();
            }
            return null;
        }
    }


    enum Cat {
        // categories
        intrinsic,
        expr_context,
        top_context,
        token_context,
        stmt_context,
        expected_type,
        prop_context,
        selected_type,

        // intrinsic
        all,

        // expr_context
        for_bound,
        foreach_collection,
        if_cond,
        while_cond,
        where,
        expr_stmt,

        // stmt_context
        top,
        then_body,
        else_body,
        for_body,
        foreach_body,
        while_body,
        handler_body,
        boxed_body,

        // top_context
        page_init,
        page_body,
        action_body,
        event_body,

        // token_context
        first_token,
        singleton,
        thing,
        nothing,

    }

    export interface ITokenObserver {
        observeGoal(s: AstState, goal: string): void;
        observeEnumerable(type: string): void;
        observeProperty(name: string): void;
        observeNestedGoal(outer: IFrequencies, inner: IFrequencies): void;
        observeSelectedType(type: string, topGoal: string): void;
    }

    interface ICategoryMap {
        [cat: string]: TokenCount;
    }

    export class FrequencyCounter implements ITokenObserver {

        public goals: GoalCounter = new GoalCounter();
        public props = new TokenCount();
        public types = new TokenCount();

        public observeEnumerable(type: string) { }
        public observeProperty(name: string) {
            this.props.count(name);
            var sp = name.split(":");
            this.types.count(sp[0]);
        }

        public observeNestedGoal(outer: IFrequencies, inner: IFrequencies) {
            Object.keys(outer).forEach(k1 =>
                Object.keys(inner).forEach(k2=> {
                    this.goals.countNested(k1, k2, outer[k1] * inner[k2]);
                })
                );
        }

        public observeGoal(s: AstState, goal: string) {
            s.goalState.goalWindow.forEach(g => {
                this.goals.countPair(g, goal);
            });
        }

        public observeSelectedType(type: string, topGoal: string): void {
            this.goals.countPair("selected:" + type, topGoal);
        }


        public display(out: Util.IOutput) {
            out.vertical(() => {
                this.props.sortedValues().forEach(pair =>
                    out.horizontal(() => {
                        out.show("Property " + pair.key + " : " + PredictionEvaluator.percentage(pair.value, this.props.total));
                    })
                    );
            });
            out.vertical(() => {
                this.goals.display(out);
            });
        }

        public classifier(max: number): IClassifier {
            return { topGoals: this.goals.windowCorrelation, propFreq: this.props, typeFreq: this.types };
        }
    }

    interface ICallingContext {
        prop: string;
        isLocal: boolean;
        type: string;
        args: string[];
        index: number;
        open_parens: number;
    }

    interface IFixContext {
        precedence: number;
        goal: any;
        resultType: string;
    }
    interface IGoalContext {
        start: number;
        goal: IFrequencies;
        fixContext: IFixContext[];
    }

    class RecentWindow {

        public recents: string[] = [];

        constructor(private max: number) {
        }

        public use(name: string) {
            var present = this.recents.indexOf(name);
            if (present >= 0) {
                this.recents.splice(present, 1);
                this.recents.push(name);
            }
            else {
                this.recents.push(name);
                if (this.recents.length > this.max) {
                    this.recents.shift();
                }
            }
        }
    }

    class TokenState extends AST.Json.NodeVisitor {

        public propStack: ICallingContext[] = [];
        public fixContext: IGoalContext[] = [];
        public currentSelectedType: string = null;
        private lastPos = -1;
        private selectedType: string[] = [];
        private goal: any[] = [];
        public nestedParenthesis: number[] = [];

        constructor(private topGoal: string, private tokens: AST.Json.JToken[], private resolver: AST.Json.IScriptResolver, private localType: (id: string) => string,
            private observer: ITokenObserver,
            private guessNestedGoal?: (parent: IFrequencies) => IFrequencies) {
            super();
        }


        public visit_token(tok: AST.Json.JToken) {
            throw "missing token specialization";
        }

        sanitizeType(type: string): string {
            if (type && type.indexOf('{') >= 0) {
                type = "UserRecord";
            }
            return type;
        }

        changeSelectedType(type: string) {
            type = this.sanitizeType(type);
            if (this.currentSelectedType != type) {
                this.currentSelectedType = type;
                if (type && this.topGoal && this.observer && this.fixContext.length == 1) {
                    this.observer.observeSelectedType(type, this.topGoal);
                }
            }
        }

        public visit_stringLiteral(lit: AST.Json.JStringLiteral): any {
            //this.observe("strlit:" + lit.value);
            //this.state.features.push(Cat.token_context, Cat.thing);
            this.changeSelectedType("String");
        }
        public visit_numberLiteral(lit: AST.Json.JNumberLiteral): any {
            //this.observe("numlit:" + lit.value.toString());
            //this.state.features.push(Cat.token_context, Cat.thing);
            this.changeSelectedType("Number");
        }
        public visit_booleanLiteral(lit: AST.Json.JBooleanLiteral): any {
            //this.observe("boolit:" + lit.value.toString());
            //this.state.features.push(Cat.token_context, Cat.thing);
            this.changeSelectedType("Boolean");
        }
        public visit_placeholder(p: AST.Json.JPlaceholder): any {
            this.changeSelectedType(<any>p.type);
        }
        public visit_localRef(local: AST.Json.JLocalRef): any {
            var localId: string = <any>(local.localId);
            var type = this.localType(localId);
            if (type) {
                this.changeSelectedType(type);
            }
            else {
                throw "local type not found";
            }
        }
        public visit_singletonRef(singleton: AST.Json.JSingletonRef): any {
            this.changeSelectedType(<any>singleton.type);
        }
        public visit_propertyRef(property: AST.Json.JPropertyRef): any {
            var parent = <string><any>property.parent;
            if (parent == "data") {
                var type = this.resolver.dataType(property.declId);
                this.changeSelectedType(type);
                return;
            }
            if (parent == "art") {
                var type = this.resolver.artType(property.declId);
                this.changeSelectedType(type);
                return;
            }
            if (parent == "♻") {
                this.changeSelectedType(property.name);
                return;
            }
            if (parent == "records") {
                this.changeSelectedType("UserRecord");
                return;
            }
            if (parent == "code" || property.declId) {
                var action = this.resolver.action(property.declId);
                var resultType;
                var tokenContext;
                if (action.outParameters.length >= 1) {
                    resultType = action.outParameters[0].type;
                }
                else {
                    resultType = "Nothing";
                }
                if (action.inParameters.length > 0) {
                    this.propStack.push({ prop: action.name, type: this.sanitizeType(resultType), args: action.inParameters.map(p => this.sanitizeType(<any>p.type)), index: 0, open_parens: 0, isLocal: true });
                    this.changeSelectedType(null); // need to see parentheses
                }
                else {
                    this.changeSelectedType(resultType);
                }
                return;
            }
            var record = this.resolver.asRecord(property);
            if (record) {
                // todo
                return;
            }
            if (parent.indexOf('{') == 0) {
                return;
                var ptype = JSON.parse(parent);
                if (ptype) {
                    if (ptype.o) {
                        // object type
                        return;
                    }
                    else if (ptype.g) {

                        // generic type
                        return;
                    }
                    else {
                        return;
                    }
                }
                else {
                    return;
                }
            }
            var jprop = this.resolver.resolve(property);
            if (jprop) {
                if (this.observer) {
                    this.observer.observeProperty(property.parent + ":" + property.name);
                }
                if (jprop.parameters.length <= 1) { // implicit this parameter is always 1st parameter
                    var rtype = this.resolver.returnType(jprop);
                    this.changeSelectedType(rtype);
                }
                else {
                    this.propStack.push({
                        prop: jprop.name,
                        type: this.sanitizeType(<any>jprop.result.type),
                        args: jprop.parameters.map(p => this.sanitizeType(<string><any>p.type)),
                        index: 0, open_parens: 0, isLocal: false
                    });
                    this.changeSelectedType(null); // need to see parentheses
                }
            }
            else {
                // deal with lvalues?
                switch (property.name) {
                    case 'get':
                        if (this.observer) {
                            this.observer.observeProperty("UserRecord:" + property.name);
                        }
                        // selected type does not change
                        return;
                    case 'confirmed':
                    case 'invalid row':
                        if (this.observer) {
                            this.observer.observeProperty("UserRecord:" + property.name);
                        }
                        this.changeSelectedType("Boolean");
                        return;
                    case 'count':
                        if (this.observer) {
                            this.observer.observeProperty("UserRecord:" + property.name);
                        }
                        this.changeSelectedType("Number");
                        return;
                    case 'set':
                    case 'clear':
                    case 'post to wall':
                        if (this.observer) {
                            this.observer.observeProperty("UserRecord:" + property.name);
                        }
                        this.changeSelectedType("Nothing");
                        return;
                    case 'add':
                        if (this.observer) {
                            this.observer.observeProperty("UserRecord:" + property.name);
                        }
                        this.changeSelectedType(null);
                        this.propStack.push({ prop: property.name, type: "Number", args: ["Number"], index: 0, open_parens: 0, isLocal: false });
                        return;
                    case 'singleton':
                    case 'add row':
                        if (this.observer) {
                            this.observer.observeProperty("UserRecord:" + property.name);
                        }
                        var rtype = this.getRecordAtType(parent);
                        this.changeSelectedType(rtype);
                        return;
                    case 'row at':
                    case 'at':
                        if (this.observer) {
                            this.observer.observeProperty("UserRecord:" + property.name);
                        }
                        this.changeSelectedType(null);
                        var rtype = this.getRecordAtType(parent);
                        this.propStack.push({ prop: property.name, type: rtype, args: ["Number"], index: 0, open_parens: 0, isLocal: false });
                        return;
                    case 'test and set':
                        if (this.observer) {
                            this.observer.observeProperty("UserRecord:" + property.name);
                        }
                        this.changeSelectedType(null);
                        var rtype = "Nothing";
                        this.propStack.push({ prop: property.name, type: rtype, args: [parent], index: 0, open_parens: 0, isLocal: false });
                        return;

                }
                throw ("unknown property " + property.name);
            }
        }
        private getRecordAtType(record: string): string {
            if (record.length > 6) {
                var end = record.slice(record.length - 6);
                if (end == " index") {
                    return record.slice(0, record.length - 6);
                }
                if (end == " table") {
                    return record.slice(0, record.length - 6);
                }
                if (record.length > 11) {
                    end = record.slice(record.length - 10);
                    if (end == " decorator") {
                        return record.slice(0, record.length - 10);
                    }
                }
                throw "unknown record name:" + record;
            }
            return this.sanitizeType(record);
        }

        private guessGoal(parent: IFrequencies): any {
            this.nestedParenthesis.push(this.lastPos);
            if (this.guessNestedGoal) {
                return this.guessNestedGoal(parent);
            }
            return null;
        }
        private resultType(goal: IGoalContext): string {
            if (goal.fixContext.length > 0) {
                return goal.fixContext[0].resultType;
            }
            return this.currentSelectedType;
        }


        public visit_operator(op: AST.Json.JOperator): any {

            switch (op.op) {
                case '(':
                    var parentGoal = this.lastIncompleteGoal(this.fixContext.peek());
                    var newGoal = { start: this.lastPos, goal: <IFrequencies>{}, fixContext: [] };
                    this.fixContext.push(newGoal); // new fix context
                    var prop = this.propStack.peek();
                    this.changeSelectedType("Initial");
                    if (prop) {
                        if (prop.open_parens == 0) {
                            if (prop.args.length > 0) {
                                newGoal.goal["a:" + prop.args[0]] = 1;
                            }
                            else {
                                newGoal.goal["a:Number"] = 1; // buggy code, pretend
                            }
                        }
                        else {
                            // guess a new goal!
                            // TODO:
                            newGoal.goal = this.guessGoal(parentGoal);
                        }
                        prop.open_parens++;
                    }
                    else {
                        newGoal.goal = this.guessGoal(parentGoal);
                    }
                    break;

                case ')':
                    var topFix = this.fixContext.pop();
                    if (!topFix) break;
                    var prop = this.propStack.peek();
                    if (prop) {
                        if (--prop.open_parens == 0) {
                            // pop prop
                            this.propStack.pop();
                            this.changeSelectedType(prop.type);
                        }
                        else {
                            this.changeSelectedType(this.resultType(topFix));
                            this.fixupGoal(topFix.start, this.lastPos, "a:" + this.currentSelectedType);
                        }
                    }
                    else {
                        this.changeSelectedType(this.resultType(topFix));
                        this.fixupGoal(topFix.start, this.lastPos, "a:" + this.currentSelectedType);
                    }
                    break;

                case ',':
                    var topFix = this.fixContext.peek();
                    topFix.fixContext = [];
                    topFix.goal = {};
                    var prop = this.propStack.peek();
                    if (prop) {
                        prop.index++;
                        if (prop.args.length > prop.index) {
                            topFix.goal["a:" + prop.args[prop.index]] = 1;
                        }
                        else {
                            topFix.goal["a:Nothing"] = 1;
                            // parse error
                        }
                    }
                    else {
                        topFix.goal["a:Nothing"] = 1;
                    }
                    this.changeSelectedType("Initial");
                    break;

                case ':=':
                    var topFix = this.fixContext.peek();
                    topFix.fixContext = [];
                    topFix.goal = {};
                    topFix.goal["a:Nothing"] = 1;
                    this.changeSelectedType("Initial");
                    break;

                case '0':
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                case '7':
                case '8':
                case '9':
                    throw "Digit not expected here";
                    break;

                case '+':
                    this.pushFix(5, "a:Number", "Number", "Number:+");
                    break;
                case '-':
                    if (this.currentSelectedType == "Number") {
                        this.pushFix(5, "a:Number", "Number", "Number:-");
                    }
                    else {
                        // prefix
                        this.pushFix(7, "a:Number", "Number", "Number:u-");
                    }
                    break;
                case 'not':
                    this.pushFix(2.5, "a:Boolean", "Boolean", "Boolean:not");
                    break;
                case 'and':
                    this.pushFix(2, "a:Boolean", "Boolean", "Boolean:and");
                    break;
                case 'or':
                    this.pushFix(1, "a:Boolean", "Boolean", "Boolean:or");
                    break;
                case '*':
                    this.pushFix(6, "a:Number", "Number", "Number:*");
                    break;
                case '/':
                    this.pushFix(6, "a:Number", "Number", "Number:/");
                    break;
                case '=':
                case '\u2260': // "!="
                case '<':
                case '\u2264': // "<="
                case '>':
                case '\u2265': // ">="
                    this.pushFix(3, "a:Number", "Boolean", "Number:" + op.op);
                    break;
                case '\u2225': // "||"
                    this.pushFix(4, "a:String", "String", "String:\u2225");
                    break;

                case 'async':
                case 'await':
                    // skip
                    break;

                default:
                    throw "Unknown operator " + op.op;
                    break;
            }
        }

        private fixupGoal(start: number, end: number, goal: string) {
            if (this.observer) {
                for (var i = start + 1; i <= end; i++) {
                    if (!this.goal[i]) {
                        var dist = {};
                        this.goal[i] = dist;
                        dist[goal] = 1;
                    }
                }
            }
        }

        private pushFix(precedence: number, goal: any, resultType: string, opProp: string) {
            if (this.observer) {
                this.observer.observeProperty(opProp);
            }
            var topFix = this.fixContext.peek();
            while (topFix.fixContext.length > 0 && topFix.fixContext.peek().precedence >= precedence) {
                topFix.fixContext.pop();
            }
            topFix.fixContext.push({ goal: goal, precedence: precedence, resultType: resultType });
            this.currentSelectedType = "Initial";
        }


        public analyze(topGoal: IFrequencies): any {
            this.propStack = [];
            this.fixContext = [];
            this.currentSelectedType = "Initial";
            var numberToken = null;
            this.fixContext.push({ start: 0, goal: topGoal, fixContext: [] });
            for (var i = 0; i < this.tokens.length; i++) {
                this.lastPos = i;
                this.recordPosInfo(i);
                var token = this.tokens[i];
                if (token.nodeType == "operator") {
                    var op = <AST.Json.JOperator>token;
                    switch (op.op) {
                        case '0':
                        case '1':
                        case '2':
                        case '3':
                        case '4':
                        case '5':
                        case '6':
                        case '7':
                        case '8':
                        case '9':
                        case '.':
                            if (!numberToken) {
                                numberToken = "";
                                this.changeSelectedType("Number");
                            }
                            numberToken = numberToken + op.op;
                            continue;

                        default:
                            break;
                    }
                }
                if (numberToken) {
                    // observe entire number here
                    numberToken = null;
                }
                this.dispatch(token);
            }
            if (numberToken) {
                // observe entire number here
                numberToken = null;
            }
            this.recordPosInfo(this.tokens.length);

            if (this.observer) {
                this.observeNestedGoals();
            }
        }

        private observeNestedGoals() {
            this.nestedParenthesis.forEach(n => {
                var outer = this.goal[n];
                var inner = this.goal[n + 1];
                this.observer.observeNestedGoal(outer, inner);
            });

        }

        private recordPosInfo(i: number) {
            this.selectedType[i] = this.currentSelectedType;
            this.goal[i] = this.lastIncompleteGoal(this.fixContext.peek());
        }

        private lastIncompleteGoal(context: IGoalContext): IFrequencies {
            var pos = context.fixContext.length - 1;
            while (pos >= 0 && context.fixContext[pos].goal == this.currentSelectedType) {
                pos--;
            }
            if (pos < 0) {
                return context.goal;
            }
            var result:IFrequencies = {};
            result[context.fixContext[pos].goal] = 1;
            return result;
        }
    }

    export class AstState {

        public resolver: AST.Json.ScriptResolver;

        public goalState: GoalState = new GoalState();

        constructor(public apiresolver: AST.Json.IResolver, private globalOnly: boolean) {
            this.resolver = new AST.Json.ScriptResolver(apiresolver);
            this.goalState.resolver = this.resolver;
            this.goalState.globalOnly = globalOnly;
        }



        public display(out: Util.IOutput) {

            out.vertical(() => {
                //            this.features.features.forEach(v => v.display(out));
            });
        }
    }

    export interface IFrequencies {
        [key: string]: number;
    }

    export interface IHistogram {
        counts: IFrequencies;
        total: number;
    }

    export interface ICorrelation {
        histoA: IHistogram;
        histoB: IHistogram;
        correlations: { [a: string]: IHistogram }
        total: number;
    }




    export interface IClassifier {
        topGoals: ICorrelation;
        propFreq: IHistogram;
        typeFreq: IHistogram;
    }

    /// Used only during training. Calculator.ts has its own predictor
    class Predictor {

        constructor(public classifier: IClassifier) {
        }

        public topGoalPrediction(window: string[]): { prediction: string; probability: number }[] {
            var freq:IFrequencies = {};
            var factor = 0;
            window.forEach(g => factor += this.classifier.topGoals.histoA[g]);
            if (factor == 0) factor = 1;
            factor = 1 / (factor);
            window.forEach(a => {
                var counts = this.classifier.topGoals.correlations[a];
                if (counts) {
                    Predictor.add(freq, counts.counts);
                }
            });
            var result = [];
            Object.keys(freq).forEach(k => result.push({ prediction: k, probability: freq[k] * factor }));
            result.sort((a, b) => b.probability - a.probability);
            return result;
        }

        static add(target: IFrequencies, source: IFrequencies) {
            Object.keys(source).forEach(k => {
                var value = source[k];
                if (target[k]) {
                    target[k] = target[k] + value;
                }
                else {
                    target[k] = value;
                }
            });
        }

        static mul(target: IFrequencies, n: number) {
            Object.keys(target).forEach(k => {
                var value = target[k];
                target[k] = value * n;
            });

        }

        static top(from: IFrequencies): { token: string; value: number; }[] {
            var elems = [];
            Object.keys(from).forEach((token) => {
                elems.push({ token: token, value: from[token] });
            });
            elems.sort((a, b) => b.value - a.value);
            return elems;
        }

    }

    class HitCounter {
        features: {
            [feature: string]: { [cat: string]: { hits: number; misses: number; distance: number } }
        } = {};

        counter(feature: string, cat: string): { hits: number; misses: number; distance: number } {
            var f = this.features[feature];
            if (!f) {
                f = {};
                this.features[feature] = f;
            }
            var c = f[cat];
            if (!c) {
                c = { hits: 0, misses: 0, distance: 0 };
                f[cat] = c;
            }
            return c;
        }

        public hit(feature: string, cat: string, distance: number) {
            var c = this.counter(feature, cat);
            c.hits++;
            c.distance += distance;
        }

        public miss(feature: string, cat: string) {
            var c = this.counter(feature, cat);
            c.misses++;
        }

        public display(out: Util.IOutput) {
            out.vertical(() => {
                Object.keys(this.features).forEach(fname => {
                    var f = this.features[fname];
                    out.horizontal(() => {
                        out.show("Feature " + fname);
                        out.vertical(() => {
                            Object.keys(f).forEach(label => {
                                var counter = f[label];
                                out.horizontal(() => {
                                    out.show("Cat " + label);
                                    out.show(" Rate: " + PredictionEvaluator.percentage(counter.hits, counter.hits + counter.misses));
                                    out.show(" Distance: " + counter.distance / counter.hits);
                                });
                            });
                        });
                    });
                });
            });

        }
    }

    export class PredictionEvaluator implements ITokenObserver {

        private predictor: Predictor;
        private hitmap = new TokenCount();
        private missmap = new TokenCount();
        private hitdistance = 0;
        private hitcounter: HitCounter = new HitCounter();
        private goalHistogram = new TokenCount();
        private nestedGoalHistogram = new TokenCount();

        constructor(classifier: IClassifier) {
            this.predictor = new Predictor(classifier);
        }


        public observeGoal(state: AstState, goal: string) {
            var predictor = this.predictor.topGoalPrediction(state.goalState.goalWindow);
            var pos = -1;
            for (var i = 0; i < predictor.length; i++) {
                if (predictor[i].prediction == goal) {
                    pos = i;
                    break;
                }
            }
            if (pos < 0) {
                this.goalHistogram.count("missed");
            }
            else {
                this.goalHistogram.count(pos.toString());
            }
        }

        public observeSelectedType(type: string, topGoal: string) {
        }

        public observeNestedGoal(outer: IFrequencies, inner: IFrequencies) {
            // we no longer do this.
        }

        public observeProperty(prop: string) { }

        public observeEnumerable(type: string) { }

        public display(out: Util.IOutput): void {
            var total = this.hitmap.total + this.missmap.total;
            var hits = this.hitmap.total;
            out.horizontal(() => {
                out.show("Total: " + total);
                out.show(" Hits: " + hits);
                out.show(" Rate: " + PredictionEvaluator.percentage(hits, total));
                out.show(" Hit distance: " + this.hitdistance / hits);
            });
            this.hitcounter.display(out);
            out.horizontal(() => {
                out.vertical(() => {
                    out.show("missed tokens");
                    this.missmap.display(out);
                });
                out.show('=============');
                out.vertical(() => {
                    out.show("hit tokens");
                    this.hitmap.display(out);
                });
            });
            out.show('=============');
            out.horizontal(() => out.show("Top Goal prediction"));
            var running = 0;
            var missed = 0;
            this.goalHistogram.sorted((a, b) => parseFloat(a.key) - parseFloat(b.key)).forEach(item => {
                running += item.value;
                if (item.key == "missed") missed = item.value;
                else {
                    out.show("within " + item.key + " : " + PredictionEvaluator.percentage(running, this.goalHistogram.total));
                }
            });
            out.show("missed: " + PredictionEvaluator.percentage(missed, this.goalHistogram.total));
            out.show('=============');
            out.horizontal(() => out.show("Nested Goal prediction"));
            var running = 0;
            var missed = 0;
            this.nestedGoalHistogram.sortedKeys().forEach(item => {
                running += item.value;
                if (item.key == "missed") missed = item.value;
                else {
                    out.show("within " + item.key + " : " + PredictionEvaluator.percentage(running, this.nestedGoalHistogram.total));
                }
            });
            out.show("missed: " + PredictionEvaluator.percentage(missed, this.nestedGoalHistogram.total));
        }

        static percentage(num: number, den: number) {
            if (!den) {
                return "--%";
            }
            var r = 10000 * num / den;
            r = Math.floor(r);
            r = r / 100;
            return r.toString() + "%";
        }
    }

}
