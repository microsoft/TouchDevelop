///<reference path='refs.ts'/>

module TDev
{
    // BUGS:
    // - Refs not handled correctly (see TD Junior)
    // - we are not generating extension methods whenever possible (see from_string in TD Junior)
    // - not show LibraryAbstractKind in dependences
    // TODOs:
    // - automated testing
    // - move rewriting to ast, so we can test on node

    export class LibraryExtractor {
        private split: AST.SplitAppIntoAppAndLibrary;

        constructor() {
            this.reset();
        }
        public reset() {
            this.split = new AST.SplitAppIntoAppAndLibrary();
        }

        private getAllDeclsToMove() : AST.DeclAndDeps[] {
            return this.split.getAllDeclsToMove();
        }

        private getRemainingDecls(): AST.DeclAndDeps[] {
            return this.split.getRemainingDecls();
        }

        // everything starts off with the user requesting to move a declaration D
        // from a script/app into a library. The identification of a pair
        // of app A and library L is needed before we can start the process. Certain
        // declarations can't be moved.
        public moveDecl(d: AST.Decl) {
            this.split.invalidate();
            if (d instanceof AST.App) {
                HTML.showErrorNotification(lf("can't add a script to a library"));
                return;
            } else if (d instanceof AST.Action && (<AST.Action>d).isEvent()) {
                HTML.showErrorNotification(lf("can't add an event action to a library (use event handlers instead)"));
                return;
            } else if (d instanceof AST.LibraryRef) {
                HTML.showErrorNotification(lf("can't move a library reference directly"));
                return;
            }
            if (this.split.getLib() == null) {
                this.selectLibraryFromScript(() => {
                    if (this.split.getLib() != null) {
                        this.processDecl(d);
                    }
                });
            } else {
                this.processDecl(d);
            }
        }

        static defaultLibraryTemplate =
            "meta version 'v2.2';\n" +
            "meta isLibrary 'yes';\n" +
            "meta hasIds 'yes';\n"
            ;

        // this dialog prompts the user to select an existing library in the app
        // or create a new one
        private selectLibraryFromScript(next: () => void) {
            var m = new ModalDialog();

            m.add(div("wall-dialog-header", lf("move to library (identify target library)")));

            if (Script.hasLibraries()) {
                m.add(div("wall-dialog-body", lf("select a referenced library:")));
                m.add(
                    Script.libraries().map((lib) => {
                        var b = DeclRender.mkBox(lib);
                        b.withClick((e) => {
                            tick(Ticks.toLibExistingLib);
                            this.split.setAppAndLib(Script,lib);
                            m.dismiss();
                        });
                        return b;
                    })
                );
            }

            if (Script.hasLibraries()) {
                m.add(div("wall-body-body", lf("or create a new library:")));
            } else {
                m.add(div("wall-body-body", lf("create a new library:")));
            }
            m.add([
                div("wall-dialog-buttons",
                    HTML.mkButton(lf("new library"), () => {
                        // make a library with default name and select it;
                        // again, a TD-specific feature not for external editors
                        var stub: World.ScriptStub = {
                            scriptName: "mylib",
                            editorName: "touchdevelop",
                            scriptText: LibraryExtractor.defaultLibraryTemplate,
                        };
                        TheEditor.newScriptAsync(stub)
                            .then((newLibrary) => {
                                var header = <Cloud.Header>newLibrary;
                                var lib = TheEditor.freshLibrary();
                                this.split.setAppAndLib(Script, lib);
                                Script.addDecl(lib);
                                TheEditor.bindLibrary(lib, Browser.TheHost.createInstalled(header));
                                tick(Ticks.toLibNewLib);
                                m.dismiss();
                            });
                    }),
                    HTML.mkButton(lf("cancel"), () => m.dismiss())),
            ]);

            m.onDismiss = () => {
                next();
            };

            m.setScroll();
            m.fullWhite();
            m.show();
        }

        // if the declaration has not been added to the "pending" set
        // then prompt the user if it's OK to move the declaration and all
        // declarations in its downward closure
        private processDecl(d: AST.Decl) {
            if (this.getAllDeclsToMove().indexOf(this.split.getter(d)) < 0) {
                var newOne = this.split.getter(d);
                this.askOKtoMove(newOne, (moveOK) => {
                    if (moveOK) {
                        this.split.addToDeclsToMove([newOne]);
                        this.selectFromRemaining();
                    }
                });
            } else
                this.selectFromRemaining();
        }

        private filterUnwanted(dl: AST.DeclAndDeps[]) {
            return dl.filter(dd => !(dd.decl instanceof AST.LibraryRef));
        }

        private askOKtoMove(toMove: AST.DeclAndDeps, next:(ok:boolean) => void) {
            var m = new ModalDialog();
            var moveOK = false;
            var theRest = this.filterUnwanted(this.split.computeClosure([toMove]));

            if (theRest.length > 0) {
                m.add(
                    div("wall-dialog-header", "moving",
                        DeclRender.mkBox(toMove.decl),
                        "to library",
                        DeclRender.mkBox(this.split.getLib()),
                        "requires moving",
                        theRest.map(dd => DeclRender.mkBox(dd.decl))
                        )
                    );

                m.add(div("wall-dialog-buttons",
                    HTML.mkButton(lf("ok"), () => { tick(Ticks.toLibOKtoMove); moveOK = true; m.dismiss(); }),
                    HTML.mkButton(lf("cancel"), () => m.dismiss())
                    ));

                m.onDismiss = () => { next(moveOK); };

                m.setScroll();
                m.fullWhite();
                m.show();
            } else {
                next(true);
            }
        }

        // once there are some declarations selected to move to the library, we help
        // the user by identifying other declarations they might want to consider moving:
        //
        // 1. subsetOfDeclsToMove: these are declarations whose direct accesses
        //    are a subset of the declsToMove; that is, the downward closure of D in this set
        //    is guaranteed to be in declsToMove (won't drag anything else in).
        //
        // 2. someFromDeclsToMove: these declarations access something from declsToMove, but
        //    access some things outside the set.

        private selectFromRemaining() {
            var remaining = this.getRemainingDecls();
            // we are going to rate the remainingDecls with respect to the current
            // set of declarations pending to move to library
            remaining.forEach((a) => AST.DeclAndDeps.rateTargetAgainstDecls(this.getAllDeclsToMove(), a));
            remaining.sort(AST.DeclAndDeps.compareSize);

            var subsetOfDeclsToMove =
                remaining.filter((dd) => dd.numberDirectDeclsToMove > 0 &&
                    dd.numberDirectDeclsToMove == dd.getAllDirectAccesses().length);
            var someFromDeclsToMove =
                remaining.filter((dd) => dd.numberDirectDeclsToMove > 0 &&
                    dd.numberDirectDeclsToMove < dd.getAllDirectAccesses().length);

            this.showDeclAndDeps(subsetOfDeclsToMove, someFromDeclsToMove);
        }

        private updateBoxes(dd: AST.DeclAndDeps) {
            if ((<any>dd).boxes != null) {
                (<any>dd).boxes.forEach(b => {
                    (<HTMLElement>b).style.backgroundColor = dd.count > 0 ? "lightblue" : "white";
                });
            }
        }

        private mkCheckBox(dd: AST.DeclAndDeps) {
            var b = DeclRender.mkBox(dd.decl);
            (<any>dd).myCheckBox = b;
            b.setFlag("selected", dd.getInclude());
            b.onclick = (e) => {
                dd.setInclude(!dd.getInclude());
                b.setFlag("selected", dd.getInclude());
                dd.count += (dd.getInclude() ? 1 : -1);
                this.updateBoxes(dd);
                dd.getTransitiveClosure().forEach(ee => { ee.count += (dd.getInclude() ? 1 : -1); });
                dd.getTransitiveClosure().forEach(ee => this.updateBoxes(ee));
            };
            return b;
        }

        private showDeclAndDep(dd: AST.DeclAndDeps, showTrans:boolean) {
            var rest = [div("wall-dialog-body", " ")];
            if (showTrans) {
                var tc = this.filterUnwanted(dd.getTransitiveClosure());
                var upto10 = tc.length >= 10 ? tc.slice(0, 10) : tc;
                rest = upto10.map(ee => {
                    var ret = div("smallDecl", DeclRender.mkNameSpaceDecl(ee.decl));
                    ret.style.backgroundColor = ee.count > 0 ? "lightblue" : "white";
                    if ((<any>ee).boxes == null) {
                        (<any>ee).boxes = [ret];
                    } else {
                        (<any>ee).boxes.push(ret);
                    }
                    return div("smallDecl", ret, " ");
                });
                rest.unshift(div("smallDecl", lf("accesses: ")));
                if (tc.length > 10) {
                    var more = tc.length - 10;
                    // TODO: make a button to expose the rest of the list
                    rest.push(div("smallDecl", "load (" + more.toString() + " more)"));
                }
                rest.push(div("smallDecl", " "));
            }
            // WARNING: don't put the return on its own line (; implicitly inserted - JavaScript semantics)
            return [this.mkCheckBox(dd)].concat(rest);
        }

        // shows the remaining declarations that fall into the subset/notsubset classification
        // (note that this doesn't include all remaining declarations)
        private showDeclAndDeps(subset: AST.DeclAndDeps[], notsubset: AST.DeclAndDeps[]) {
            this.split.getAll().forEach(dd => { dd.count = 0; (<any>dd).boxes = null; });
            this.getAllDeclsToMove().forEach(dd => dd.count = 1);

            var closureBoxes: HTMLElement[] = [];
            var m = new ModalDialog();

            m.add([
                div("wall-dialog-header",
                    lf("move to library (pending)"),
                    DeclRender.mkBox(this.split.getLib()))
            ]);

            m.add([div("wall-dialog-body", lf("elements pending to move:"))]);
            m.add(this.filterUnwanted(this.getAllDeclsToMove()).map(dd => {
                var name = div("smallDecl",DeclRender.mkNameSpaceDecl(dd.decl));
                name.style.backgroundColor = "lightblue";
                return div("smallDecl", name, " ");
            }));

            m.add([
                div("wall-dialog-buttons",
                    ((subset.length == 0 && notsubset.length == 0) ? <any>"" :
                    <any>HTML.mkButton(lf("advance selected to pending"), () => {
                        tick(Ticks.toLibAdvanceSelectedToPending);
                        // TODO: don't dismiss, reconfigure modal dialog in place instead.
                        m.dismiss();
                        var selectedToAdd = subset.concat(notsubset).filter(dd => dd.getInclude());
                        this.split.addToDeclsToMove(selectedToAdd);
                        this.selectFromRemaining();
                    })),
                    HTML.mkButton(lf("make the move"), () => {
                        var errors = AST.TypeChecker.tcApp(this.split.getApp());
                        if (errors == 0) {
                            m.dismiss();
                            ModalDialog.ask(lf("Confirm rewrite (no undo)?"), lf("confirm"), () => {
                                tick(Ticks.toLibMakeTheMove);
                                this.moveToLibrary();
                            });
                        } else {
                            HTML.showErrorNotification(lf("You must correct errors in script before rewriting can proceed."));
                        }
                    }),
                    HTML.mkButton(lf("discard pending"), () => { tick(Ticks.toLibDiscardPending); this.reset(); m.dismiss(); }),
                    HTML.mkButton(lf("exit to editor"), () => { tick(Ticks.toLibExitToEditor); m.dismiss(); })
                )
            ]);

            if (subset.length > 0) {
                m.add(div("wall-dialog-header", lf("elements you should think about moving to library (they only access pending elements).")));
                subset.forEach(dd => m.add(this.showDeclAndDep(dd, true)));
            }

            if (notsubset.length > 0) {
                m.add(div("wall-dialog-header", lf("elements that access pending elements and other elements:")));
                notsubset.forEach(dd => m.add(this.showDeclAndDep(dd,true)));
            }

            m.onDismiss = () => {  };

            m.setScroll();
            m.fullWhite();
            m.show();
        }

        private moveToLibrary() {
            // perform the split of application into application/library
            this.split.makeSplit();

            // make the new library (TODO: most of this code should be elsewhere)
            World.getInstalledHeaderAsync(this.split.getLib().guid)
                .then((hd: Cloud.Header) => {
                    if (!hd) Util.userError("no such script " + this.split.getLib().guid);
                    return World.updateInstalledScriptAsync(hd, this.split.library, null)
                })
                .then(() => {
                    this.split.getApp().notifyChangeAll();
                    TheEditor.typeCheckNow();
                    TheEditor.undoMgr.pushMainUndoState();
                    // TODO: get rid of this horrible hack
                    Util.setTimeout(1, () => {
                        this.reset();
                        TheEditor.reload();
                    });
                })
                .done()
        }
    }


}
