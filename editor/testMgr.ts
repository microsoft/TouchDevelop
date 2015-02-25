///<reference path='refs.ts'/>

module TDev.TestMgr
{
    export class TestHost
        extends EditorHost
        implements RuntimeHost
    {
        constructor()
        {
            super()
        }

        scriptId = "?";
        actionName = "none";
        exceptionThrown = false;


        public showWall()
        {
            this.wallVisible = true
            this.getWall().style.opacity = "0";
            elt("testHostFrame").setChildren([ this.getWall() ]);
        }

        public liveMode() { return false; }

        public exceptionHandler(e:any)
        {
            this.exceptionThrown = true;

            if (this.scriptId != "?") {
                var bug = Ticker.mkBugReport(e, "autotest-" + this.scriptId + "-" + this.actionName);
                this.attachScriptStackTrace(bug);
                if (!/http:\/\/localhost/.test(bug.jsUrl))
                    Util.sendErrorReport(bug);
            }
        }

        wall = div("sideWall");
        public getWall() { return this.wall; }
        public newWall() {
            this.wall = div("sideWall");
        }
        public notifyStopAsync() : Promise {
            this.onStop();
            return Promise.as();
        }
        public notifyHideWall() {}
        public notifyPagePush() {}
        public notifyPagePop(p:WallPage) {}
        public dontWaitForEvents() { return true; }
        public wallShown() { }
        public wallHidden() { }
        public updateButtonsVisibility() { }
        public notifyPageButtonUpdate() { }
    }

    export interface ScriptTestResult {
        id:string;
        name:string;
        numErrors:number;
        actions:ActionTestResult[];
        totalTime:number;
        normalizedTotalTime:number;
        downloadError:boolean;
    }

    export interface ActionTestResult {
        name:string;
        error:string; // empty if none
        time:number; // run time in ms
    }

    var rt:Runtime;
    var testHost:TestHost;

    function compileForTestsAsync(flags: AST.CompilerOptions = null)
    {
        rt = new Runtime();

        AST.TypeChecker.tcApp(Script);

        if (flags == null) {
            var flags: AST.CompilerOptions = {
                tracing: false,
                replaying: false,
                profiling: false,
                optimizeLoops: /optimizeLoops/.test(document.URL),
                inlining: Browser.compilerInlining || /inlining/.test(document.URL),
                okElimination: Browser.compilerOkElimination || /okElimination/.test(document.URL),
                blockChaining: Browser.compilerBlockChaining || /blockChaining/.test(document.URL),
                commonSubexprElim: /commonSubexprElim/.test(document.URL),
                constantPropagation: /constantPropagation/.test(document.URL),
                coverage: false,
                crashOnInvalid: /crashOnInvalid/.test(document.URL),
            };
        }
        var compileCounter = TDev.RT.Perf.start("compile." + testHost.scriptId);
        var cs = AST.Compiler.getCompiledScript(Script, flags);
        TDev.RT.Perf.stop(compileCounter);
        rt.initFrom(cs);
        Runtime.theRuntime = rt;
        RT.ArtCache.resetProgress();
        rt.setHost(testHost);
        return rt.initDataAsync();
    }

    function emptyResult(id:string)
    {
        var testRes:ScriptTestResult = {
            id: id,
            name: Script.getName(),
            numErrors: 0,
            actions: [],
            totalTime: 0,
            normalizedTotalTime: 0,
            downloadError: false
        }
        return testRes
    }

    export function runTestsAsync(id: string, flags:AST.CompilerOptions = null)
    {
        var totalTime = 0;
        var testRes = emptyResult(id);
        var res = new PromiseInv();
        var tests = Script.orderedThings().filter((t) => {
            if (t instanceof AST.Action) {
                var a = <AST.Action>t;
                return a.isTest();
            } else return false;
        });

        testHost = new TestHost();
        testHost.scriptId = id;

        if (Script.getName() === undefined) {
            testRes.downloadError = true;
            res.success(testRes);
            return res;
        }

        RT.ArtCache.runningTests = true;
        compileForTestsAsync(flags).done(() => {

            var idx = 0;
            var doTest = () => {
                if (idx >= tests.length) {
                    testRes.totalTime = totalTime;
                    RT.ArtCache.runningTests = false;
                    res.success(testRes);
                } else {
                    var act = <AST.Action>tests[idx++];
                    Util.log("Testing {0}", act.getName())
                    var actStart = TDev.RT.Perf.start(id+"."+act.getName());
                    var actRes:ActionTestResult = {
                        name: act.getName(),
                        error: "",
                        time: 0
                    }
                    testRes.actions.push(actRes)

                    testHost.exceptionThrown = false;
                    testHost.actionName = act.getName();

                    testHost.showWall();

                    testHost.onStop = () => {
                        actRes.time = TDev.RT.Perf.stop(actStart);
                        totalTime += actRes.time;
                        if (testHost.exceptionThrown) {
                            testRes.numErrors++;
                            actRes.error = "exception";
                        }
                        Util.setTimeout(0, doTest);
                    };

                    if (act.isCompilerTest()) {
                        if (!act._errorsOK)
                            testHost.exceptionHandler(new Error("error mismatch"));
                        testHost.onStop();
                    } else {
                        rt.initPageStack();
                        rt.devMode = true;
                        rt.currentScriptId = id;
                        rt.baseScriptId = "unknown";
                        rt.testMode = true;

                        ProgressOverlay.bumpShow(); // rt.run is calling hide

                        if (act.isPage()) {
                            rt.run(Runtime.syntheticFrame((s) => {
                                s.rt.postAutoPage("this", actRes.name);
                            }), []);
                        } else {
                            rt.run(rt.compiled.actionsByStableName[act.getStableName()], []);
                        }
                    }
                }
            }

            doTest();

        })

        return res;
    }

    function displayResults(res:ScriptTestResult[])
    {
        elt("testHostFrame").setChildren([]);

        var m = new ModalDialog();
        var d = div("test-results");
        m.add(d);
        m.noChrome();
        m.setScroll();

        var ok = res.every((r) => r.numErrors == 0);

        var h = "";

        var numTotal = 0;
        var numFailed = 0;

        var perScript = "";
        res.forEach((r) => {
            perScript += "<div><b class='" + (r.numErrors ? "test-error" : "test-ok") + "'>" + r.name + "</b> (" +
                 r.normalizedTotalTime.toFixed(3) + ' - ' + r.totalTime.toFixed(0) + "ms, " + r.id + "): ";
            if (r.actions.length == 0) {
                numTotal++;
                if (r.numErrors) numFailed++;
            }
            r.actions.forEach((a) => {
                numTotal++;
                perScript += "<span class='" + (a.error ? "test-error" : "test-ok") + "'>" + a.name + "</span>";
                if (a.error) numFailed++;
                if (a.time > 20) {
                    perScript += " (" + a.time.toFixed(0) + "ms)";
                }
                perScript += ", ";
            })
            perScript += "</div>\n";
        });

        if (ok) {
            h += "<h2 class='test-ok'>tests ok</h2>\n"
        } else {
            h += "<h2 class='test-error'>" + numFailed + " of " + numTotal + " tests failed</h2>\n"
        }

        Browser.setInnerHTML(d, h);
        m.show();
    }

    export function testCurrentScript()
    {
        ProgressOverlay.lockAndShow(lf("testing current script"), () => {
            runTestsAsync("?").done((res:ScriptTestResult) => {
                ProgressOverlay.hide();
                displayResults([res]);
            })
        })
    }

    var testsFromTag = false;
    var numTests = 0;

    export function getNumScripts(): number {
        return numTests;
    }

    export function dumpCurrentScript()
    {
        var s = new CopyRenderer().dispatch(TDev.Script);
        Browser.setInnerHTML(elt("root"), CopyRenderer.css + s);
    }
}
