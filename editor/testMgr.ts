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

    function displayResults(res:ScriptTestResult[], betaMode = false, msg = "")
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

        if (res.length > 1) {

            if (Benchmarker.jsProgramsTested.aggregatesCount() > 0) {
                perScript += "<div><br/>performance benchmarks (JavaScript)</div>"
            }
            Benchmarker.jsProgramsTested.forEachAggregate((mes: Benchmarker.SumMeasurement) => {
                perScript += "<div><b class='" + (!mes.correct ? "test-error" : "test-ok") + "'>" + mes.name + "</b>"
                    + " (" + (mes.average / TDev.RT.Perf.unit()).toFixed(3) + ' - '
                    + mes.average.toFixed(0) + "ms)</div>\n";
                if (!mes.correct) {
                    numFailed++;
                    ok = false;
                }
                numTotal++;
            });
            if (Benchmarker.jsProgramsTested.aggregatesCount() > 0) {
                perScript += "<div><br/>performance benchmarks (TouchDevelop)</div>"
            }
            Benchmarker.tdProgramsTested.forEachAggregate((mes: Benchmarker.SumMeasurement) => {
                perScript += "<div><b class='" + (!mes.correct ? "test-error" : "test-ok") + "'>" + mes.name + "</b>"
                    + " (" + (mes.average / TDev.RT.Perf.unit()).toFixed(3) + ' - '
                    + mes.average.toFixed(0) + "ms)</div>\n";
                if (!mes.correct) {
                    numFailed++;
                    ok = false;
                }
                numTotal++;
            });
        }

        if (ok && isBeta) return; // skip confirmation dialog in beta unless something fails
        if (ok) {
            h += "<h2 class='test-ok'>tests ok</h2>\n"
            if (betaMode)
                h += "<div class='test-important'>Thank you for your help in making TouchDevelop better! " +
                     "If you find anything fishy about this beta version, please let " +
                     "us know at touchdevelop@microsoft.com.</div>";
        } else {
            h += "<h2 class='test-error'>" + numFailed + " of " + numTotal + " tests failed</h2>\n"
            if (betaMode)
                h += "<div class='test-important'>Thank you for finding these issues! Developers have been notified. " +
                     "You may want to leave the beta version and go back to the main version.</div>";
        }

        h += "<div>" + msg + "</div>";

        Browser.setInnerHTML(d, h + (betaMode ? "" : perScript));

        var leave = betaMode && !ok

        d.appendChild(div("wall-dialog-buttons",
            leave ? HTML.mkButton(lf("leave beta now"), () => {
                Util.navigateInWindow("https://www.touchdevelop.com/app/")
            }) : null,
            HTML.mkButton(leave ? "keep using beta" : "ok", () => { m.dismiss() })))

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

    export function testAllScripts(isBeta = false)
    {
        return Cloud.isOnlineWithPingAsync()
            .then((isOnline: boolean) => {
                if (!isOnline) {
                    TDev.ModalDialog.info(lf("Tests cancelled"), lf("You seem to be offline. Tests can only run when you are online."));
                    return;
                }

                var scriptsToRun = []
                var startTime = TDev.RT.Perf.startPaused('tests', true);
                var tryAgain = 5;

                var fetch = (cont: string) => {
                    Browser.TheApiCacheMgr.getAsync("test/scripts?applyupdates=true&etagsmode=etagsonly&count=103" +
                                                    (cont ? "&continuation=" + cont : "")).then((resp: JsonList) =>
                                                    {
                                                        resp.etags.forEach((it) => scriptsToRun.push(it.id))
                                                        if (resp.continuation) fetch(resp.continuation);
                                                        else finish();
                                                    })
                }

                var finishCore = () => {
                }

                var finish = () => {
                    var results: ScriptTestResult[] = []
                    var scriptCache: any = {}
                    numTests = scriptsToRun.length;
                    ProgressOverlay.lockAndShow(isBeta ? lf("thank you for trying the beta!") : lf("running platform tests"), () => {
                        var idx = 0;
                        var lastBreak = Util.now();

                        if (isBeta)
                            ProgressOverlay.setAddInfo([lf("we're running some tests; thanks for waiting")]);

                        var doNext = () => {
                            if (idx >= scriptsToRun.length) {
                                ProgressOverlay.hide();
                                numTests = 0;
                                setGlobalScript(null);
                                var totalTime = TDev.RT.Perf.stop(startTime);
                                totalTime += Benchmarker.jsProgramsTested.totalTime();
                                totalTime += Benchmarker.tdProgramsTested.totalTime();
                                var msg = "";
                                if (isBeta)
                                    msg = "total test run time: " + totalTime.toFixed(0) + "ms";
                                else
                                    msg = "total test run time: " + (totalTime / TDev.RT.Perf.unit()).toFixed(3) + " - " + totalTime.toFixed(0) + "ms";
                                displayResults(results, isBeta, msg);
                                return;
                            }

                            var id = scriptsToRun[idx];
                            ProgressOverlay.setProgress("script " + id + " (" + (idx + Benchmarker.getNumScripts() + 1).toString()
                                + " of " + (scriptsToRun.length + Benchmarker.getNumScripts()).toString() + ")");
                            idx++;

                            var getScript = (s) => {
                                if (!s) s = id;
                                var r = scriptCache[s];
                                if (r) return Promise.as(r);
                                return ScriptCache.getScriptAsync(s).then((text) =>(scriptCache[s] = text));
                            }

                            var start = Util.now();
                            AST.loadScriptAsync(getScript).done((resp: AST.LoadScriptResult) => {
                                if (resp.numErrors > 0 && Script.actions().every((a) => !a.isCompilerTest())) {
                                    var res = emptyResult(id);
                                    res.numErrors = 1;
                                    res.name += " (parse errors)";
                                    results.push(res);

                                    var h = new TestHost();
                                    h.scriptId = id;
                                    h.exceptionHandler(new Error(resp.status));

                                    doNext();
                                } else {
                                    TDev.RT.Perf.resume(startTime);
                                    var timeToken = TDev.RT.Perf.start(id);
                                    runTestsAsync(id).done((res: ScriptTestResult) => {
                                        var n = Util.now();
                                        TDev.RT.Perf.pause(startTime);
                                        var ellapsed = n - start;
                                        res.totalTime = TDev.RT.Perf.stop(timeToken);
                                        res.normalizedTotalTime = res.totalTime / TDev.RT.Perf.unit();
                                        if (res.downloadError) {
                                            if (--tryAgain == 0) {
                                                ProgressOverlay.hide();
                                                HTML.showProgressNotification(lf("Failed to perform tests. Are you online?"));
                                                return;
                                            }
                                            --idx;
                                            doNext();
                                            return;
                                        }
                                        results.push(res);
                                        if (n - lastBreak > 500) {
                                            lastBreak = n;
                                            Util.setTimeout(1, doNext);
                                        } else {
                                            doNext();
                                        }
                                    })
                                }
                            })
                        }

                        var displayError = (err: any) => {
                            ProgressOverlay.hide();
                            numTests = 0;
                            HTML.showProgressNotification(lf("Failed to perform tests. Are you online?"));
                        };

                        var runUnitBench = (TDev.RT.Perf.unit() < 0) ? true : false;
                        Benchmarker.runUnitBenchmarksAsync(/*testOnly=*/!runUnitBench,/*updateOverlay=*/true).then(() => {
                            return Benchmarker.runTDBenchmarksAsync(/*test=*/true,/*update=*/true);
                        }).then(() => {
                            return Promise.join(scriptsToRun.map((id) =>
                                ScriptCache.getScriptAsync(id).then((text) => {
                                    scriptCache[id] = text;
                            })));
                        }).done(doNext, displayError);

                    })
                }

                if (testsFromTag)
                    fetch(null)
                else {
                    scriptsToRun = testScripts;
                    finish();
                }
            });
    }

    export function runBetaTests() {
        return; // note: we don't have enough tests and it is currently breaking down the tutorial exprience

        if (!Cloud.getAccessToken() || // the login will interupt the beta tests anyways
            dbg) // don't run tests for dbg users, as those do not represent general population anyway
            return;

        var betaFriendlyId = (<any>window).betaFriendlyId;
        if (!Browser.isWP8app
            && betaFriendlyId
            && window.localStorage["betaTestsRunFor"] != betaFriendlyId) {
            window.localStorage["betaTestsRunFor"] = betaFriendlyId;
            testAllScripts(true);
        }
    }

    export function dumpCurrentScript()
    {
        var s = new CopyRenderer().dispatch(TDev.Script);
        Browser.setInnerHTML(elt("root"), CopyRenderer.css + s);
    }
}
