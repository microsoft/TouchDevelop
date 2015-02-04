///<reference path='../editor/refs.ts'/>

module TDev.IntelliTrain {

    class TestTrainer {
        body: HTMLElement;
        progress: HTMLElement;
        heading: HTMLElement;
        timerToken: number;
        control: HTMLElement;
        pane: HTMLElement;
        resolver: AST.Json.WebAPIResolver;
        selector: HTMLElement;

        globalclassifier: IClassifier;
        localclassifier: IClassifier;

        constructor(element: HTMLElement) {
            this.body = element;
            this.body.appendChild(TDev.text('The time is: '));
            this.progress = TDev.span('progress', '');
            this.body.appendChild(this.progress);
            this.heading = TDev.div('heading');
            this.body.appendChild(this.heading);
            this.control = document.createElement('div');
            this.body.appendChild(this.control);
            this.selector = document.createElement('div');
            this.body.appendChild(this.selector);
            this.pane = TDev.div("pane frame");
            this.body.appendChild(this.pane);
        }

        showUI() {
            var numScripts = document.createElement('input');
            numScripts.value = "200";
            var learnBulk = document.createElement('button');
            learnBulk.innerText = "Learn";
            var learn = TDev.div('inlinebox frame', learnBulk, numScripts, TDev.text(" scripts"));
            this.control.appendChild(learn);
            learnBulk.onclick = () => this.learnBulk(parseInt(numScripts.value));

            var scriptId = document.createElement('input');
            scriptId.value = "bflza";
            var learnOne = document.createElement('button');
            learnOne.innerText = "Learn";
            var learnit = TDev.div('inlinebox frame', learnOne, TDev.text(" local script "), scriptId);
            this.control.appendChild(learnit);
            learnOne.onclick = () => this.learnOne(scriptId.value);


            var showClassifier = document.createElement('button');
            showClassifier.innerText = "Show classifier";
            var showit = TDev.div('inlinebox frame', showClassifier);
            this.control.appendChild(showit);
            showClassifier.onclick = () => {
                if (this.localclassifier) {
                    this.pane.innerText = JSON.stringify(this.localclassifier);
                }
            };

            var testScript = document.createElement('input');
            testScript.value = "bflza";
            var testOn = document.createElement('button');
            testOn.innerText = "Test";
            var testIt = TDev.div('inlinebox frame', testOn, TDev.text(" local script "), testScript);
            this.control.appendChild(testIt);
            testOn.onclick = () => this.testOne(testScript.value);


        }


        testOne(id: string) {
            var body = this.pane;
            body.innerHTML = "";

            if (!this.localclassifier) return;
            var tester = new PredictionEvaluator(this.localclassifier);

            var finishedWithAnalysis = function () {
                var out = new TDev.Util.HtmlOutput(body);
                tester.display(out);
            };

            var observer = new IntelliTracer(tester, this.resolver, false);
            observer.visitScript(id, () => { finishedWithAnalysis(); });
        }


        addClassifier(cl: IClassifier) {
            this.setClassifier(cl);
        }

        setClassifier(cl: IClassifier) {
            this.localclassifier = cl;
            this.selector.innerHTML = "";
        }


        learnOne(id: string) {

            var body = this.pane;
            body.innerHTML = "";

            var counters = new FrequencyCounter();
            var handleScriptId = (v: string) => {
                var observer = new IntelliTracer(counters, this.resolver, false);
                observer.visitScript(v, () => { finishedWithAnalysis(); });
            }

            var finishedWithAnalysis = () => {
                var out = new TDev.Util.HtmlOutput(body);
                counters.display(out);
                this.addClassifier(counters.classifier(100));
            };

            handleScriptId(id);
        }

        learnBulk(n: number) {
            var totalCount = 0;
            var toGetCount = n;
            var handledCount = 0;
            var analyzedCount = 0;

            var body = this.pane;
            var heading = this.heading;

            body.innerHTML = "";

            var scripts = TDev.Util.httpRequestAsync("http://www.touchdevelop.com/api/scripts?count=100");


            var counters = new FrequencyCounter();

            var finishedWithScripts = function () {
                var div = document.createElement('div');
                div.innerText = "Handled " + handledCount + " items. Total scripts examined: " + totalCount;
                body.appendChild(div);
            };
            var finishedWithAnalysis = () => {
                analyzedCount++;
                if (analyzedCount == toGetCount) {
                    var out = new TDev.Util.HtmlOutput(body);
                    counters.display(out);
                    this.globalclassifier = counters.classifier(100);
                    this.setClassifier(this.globalclassifier);
                }
            };
            var hasError = function (v) {
                var div = document.createElement('div');
                div.innerText = "Error occurred: " + v;
                body.appendChild(div);
            }
        var getScripts = function (v) {
                var rval = JSON.parse(v);
                if (rval && rval.items) {
                    totalCount += rval.items.length;
                    rval.items.forEach(handleScript);
                    heading.innerText = "Current count: " + handledCount;

                    if (handledCount < toGetCount && rval.continuation) {
                        scripts = TDev.Util.httpRequestAsync("http://www.touchdevelop.com/api/scripts?count=100&continuation=" + rval.continuation);
                        scripts.done(getScripts, hasError);
                    }
                    else {
                        finishedWithScripts();
                    }
                }
            };

            var handleScript = (v: JsonScript) => {

                if (v.haserrors) return;
                if (v.updateid != v.id) return;

                if (handledCount < toGetCount) {
                    handledCount++;
                    var div = document.createElement('div');
                    div.innerText = v.id + " " + v.name;
                    body.appendChild(div);

                    // for debugging
                    //var tokenizer = new TokenVisitor(div);
                    //tokenizer.visitScript(v.id);
                    var observer = new IntelliTracer(counters, this.resolver);
                    observer.visitScript(v.id, () => { finishedWithAnalysis(); });
                }
            };

            scripts.done(getScripts, hasError);

        }




        start() {
            this.timerToken = setInterval(() => this.progress.innerHTML = new Date().toUTCString(), 500);


            var apis = TDev.Util.httpRequestAsync("http://www.touchdevelop.com/api/language/apis");

            apis.done((japis) => {
                var apis = JSON.parse(japis);
                this.resolver = new AST.Json.WebAPIResolver(apis);
                this.showUI();
            },
                (e) => { throw e; });

        }

        stop() {
            clearTimeout(this.timerToken);
        }


    }

}
