///<reference path='refs.ts'/>

module TDev {
  export interface ExternalEditor {
    // 3 fields are for our UI
    company: string;
    name: string;
    description: string;
    // Unique
    id: string;
    // The domain root for the external editor.
    origin: string;
    // The path from the domain root to the editor main document.
    path: string;
    // url to the logo image
    logoUrl: string;
    // order in menu
    order: number;
  }

  var externalEditorsCache: ExternalEditor[] = null;

  export function getExternalEditors(): ExternalEditor[] {
    if (!externalEditorsCache) {
      // Detect at run-time where we're running from!
      var url = Ticker.mainJsName.replace(/main.js$/, "");
      var match = url.match(/(https?:\/\/[^\/]+)(.*)/);
      var origin = match[1];
      var path = match[2];

      var isLocal = /^https?:\/\/localhost/i.test(document.location.href);
      var isTest = /^https:\/\/test\./i.test(document.location.href);
      var isStage = /^https:\/\/stage\./i.test(document.location.href);

      var CK_ORIGINS = {
        LOCAL: 'http://localhost:8888',
        TEST: 'https://microbit-development.codekingdoms.com',
        STAGE: 'https://microbit-staging.codekingdoms.com',
        LIVE: 'https://microbit.codekingdoms.com'
      };

      var PY_ORIGINS = {
        LOCAL: 'http://localhost:8000',
        TEST: 'https://microbit-test.pythonanywhere.com',
        STAGE: 'https://microbit-staging.pythonanywhere.com',
        LIVE: 'https://microbit.pythonanywhere.com'
      };


      var ckOrigin;
      var pyOrigin;

      if (isLocal && !dbg) {
        ckOrigin = CK_ORIGINS.LOCAL;
        pyOrigin = PY_ORIGINS.LOCAL;
      } else if (isTest || dbg) {
        ckOrigin = CK_ORIGINS.TEST;
        pyOrigin = PY_ORIGINS.TEST;
      } else if (isStage) {
        ckOrigin = CK_ORIGINS.STAGE;
        pyOrigin = PY_ORIGINS.STAGE;
      } else {
        ckOrigin = CK_ORIGINS.LIVE;
        pyOrigin = PY_ORIGINS.LIVE;
      }

      var ckPath = isLocal ? '/microbit/sequencer/bin/' : '/';
      var blocksPath = dbg ? "?dbg=1" : isLocal ? "?local=1" : isTest ? "?test=1" : "";

      externalEditorsCache = [ /* {
        name: "C++ Editor",
        description: "Directly write C++ code using Ace (OUTDATED)",
        id: "ace",
        origin: origin,
        path: path + "ace/editor.html"
        icon: ""
      }, */
        {
          company: "Microsoft",
          name: "Block Editor",
          description: "Drag and drop blocks to code!",
          id: "blockly",
          origin: origin,
          path: path + "blockly/editor.html" + blocksPath,
          logoUrl: "https://az742082.vo.msecnd.net/pub/vrvndwmo",
          order: 1,
        }, {
          company: "Code Kingdoms",
          name: "JavaScript",
          description: "Code JavaScript with the CK editor",
          id: 'codekingdoms',
          origin: ckOrigin,
          path: ckPath,
          logoUrl: ckOrigin + ckPath + 'img/codekingdoms-microbit.png',
          order: 0,
        }];

      if (TDev.isBeta || isLocal) {
        externalEditorsCache.push(
        {
          company: "The Python Software Foundation",
          name: "MicroPython",
          description: "Hack your micro:bit with MicroPython!",
          id: "python",
          origin: pyOrigin,
          path: "/editor.html",
          logoUrl: pyOrigin + '/static/img/python-powered.png',
          order: 3
        })
      }
    }
    return externalEditorsCache;
  }

  // Assumes that [id] is a valid external editor id.
  export function editorById(id: string): ExternalEditor {
    var r = getExternalEditors().filter(x => x.id == id);
    return r[0];
  }

  export module External {
    export var TheChannel: Channel = null;
    // We need that to setup the simulator.
    export var microbitScriptId = "lwhfye";

    import J = AST.Json;

    export function pullLatestLibraryVersion(pubId: string): Promise { // of string
      var forced = ScriptCache.forcedUpdate(pubId)
      if (forced) return Promise.as(forced.json.id)

      return Browser.TheApiCacheMgr.getAsync(pubId, Cloud.isOffline())
        .then((script: JsonScript) => {
          if (script) {
            return script.updateid;
          } else {
            // in case the one above fails, we also try the stale one from the
            // cache
            return Browser.TheApiCacheMgr.getAsync(pubId, true)
              .then(() => Promise.delay(2000))
              .then((script: JsonScript) => {
                if (script)
                  return script.updateid;
                else
                  return pubId;
              });
          }
        });
    }

    // This function modifies its argument by adding an extra [J.JLibrary]
    // to its [decls] field that references the device's library.
    function addLibrary(libMap: { [name: string]: LibEntry }, name: string, app: J.JApp): J.JLibrary {
      var resolves = libMap[name].depends.map((d: string) => {
        var quoted = AST.Lexer.quoteId(d);
        return "  usage { } resolve "+quoted+" = ♻ "+quoted+" with { }\n";
      });
      var txt =
        'meta import ' + AST.Lexer.quoteId(name) + ' {\n' +
        '  pub "' + libMap[name].pubId + '"\n'+
        resolves +
        '}';
      // Apparently, parsing a "meta import" declaration with "resolves" clauses
      // generates several LibraryRef's. The first one is the one we want.
      var lib = <AST.LibraryRef> AST.Parser.parseDecls(txt)[0];
      var jLib = <J.JLibrary> J.addIdsAndDumpNode(lib);
      jLib.id = name;
      app.decls.push(jLib);
      return jLib;
    }

    function addResolves(idMap: { [name: string]: string }, lib: J.JLibrary) {
      lib.resolveClauses.forEach((c: J.JResolveClause) => {
        c.defaultLibId = <any> idMap[c.name];
      });
    }

    function addLibraries(app: J.JApp, libMap: { [i: string]: LibEntry }): Promise {
      var libNames = Object.keys(libMap);
      var latestVersions = libNames.map((name: string) => {
        return pullLatestLibraryVersion(libMap[name].pubId);
      });
      return Promise.join(latestVersions).then((latestVersions: string[]) => {
        // Update in-place the [libMap] argument with the latest [pubId]'s.
        latestVersions.map((pubId: string, i: number) => {
          libMap[libNames[i]].pubId = pubId;
        });
        // This allows us to add proper [JLibrary] declarations to the main
        // [JApp].
        var libs = libNames.map((libName: string) => addLibrary(libMap, libName, app));
        // A map from a library name to its JSON-id.
        var idMap: { [name: string]: string } = {};
        libs.forEach((l: J.JLibrary) => {
          idMap[l.name] = l.id;
        });
        // Which we need to perform a little bit of fix-up.
        libs.forEach((l: J.JLibrary) => {
          addResolves(idMap, l);
        });
      });
    }

    // For compatibility with the old format
    function fixupLibs(libs: { [i: string]: any }) {
      Object.keys(libs).forEach((k: string) => {
        if (typeof libs[k] == "string")
          libs[k] = { pubId: libs[k], depends: [] };
      });
    }

    function roundtrip1(a: J.JApp, libs: { [i: string]: LibEntry }): Promise { // of AST.App
      return addLibraries(a, libs).then(() => {
        var text = J.serialize(a);
        return Embedded.parseScript(text).then((a: AST.App) => {
          if (AST.TypeChecker.tcApp(a) > 0) {
            throw new Error("We received a script with errors and cannot compile it. " +
                "Try converting then fixing the errors manually.");
          }
          return Promise.as(a); }
        );
      });
    }

    // Takes a [JApp] and runs its through various hoops to make sure
    // everything is type-checked and resolved properly.
    function roundtrip(a: J.JApp, libs: { [i: string]: LibEntry }): Promise { // of J.JApp
      return roundtrip1(a, libs).then((a: AST.App) => {
        return Promise.as(J.dump(a));
      });
    }

    class ExternalHost extends EditorHost {
      public updateButtonsVisibility() {
      }

      public showWall() {
        super.showWall();
        document.getElementById("wallOverlay").style.display = "none";
        var w = <HTMLElement> document.querySelector(".wallFullScreenContainer");
        w.style.height = "auto";
        w.style.display = "";
        if(TheChannel.editor.id == 'python') {
            // A nice Pythonic sidebar (Python doesn't use the simulator).
            elt("externalEditorSide").style.background = "#336699 url(https://az742082.vo.msecnd.net/pub/psopafpj) 0 0 repeat";
            var bbcLogo_src = TheChannel.editor.origin + '/static/img/bbcLogo.png';
            var bbcLogo = div("wallFullScreenLogo", HTML.mkImg(bbcLogo_src));
            var link = HTML.mkA(null, 'http://python.org/community/microbit/', "_blank", null);
            var logo_src = TheChannel.editor.origin + '/static/img/micropython.png';
            var logo_image = HTML.mkImg(logo_src);
            link.appendChildren([logo_image]);
            var logo = div("wallFullScreenLogo", link);
            //var logo = div("wallFullScreenLogo", HTML.mkImg(TheChannel.editor.logoUrl));
            var wrapper = div("wallFullScreenWrapper");
            var snake_src = TheChannel.editor.origin + '/static/img/snake.png';
            var snake_img = HTML.mkImg(snake_src);
            snake_img.style.position = "absolute";
            snake_img.style.marginTop = "-48px";
            snake_img.style.marginLeft = "-14px";
            var header = document.createElement("span");
            header.setChildren("Instructions");
            header.style.fontSize = "3rem";
            header.style.color = "#1A354C";
            header.style.fontFamily = '"Segoe UI Light","Segoe UI","Segoe WP Light","Segoe WP","HelveticaNeue-Light","Helvetica Neue Light","Helvetica Neue",sans-serif';
            var list_items = [];
            var instructions = [
                "Type in your Python program",
                "Click 'Download' and save the file",
                "Plug in your BBC micro:bit, it'll show up as USB storage",
                "Drag the saved file onto the BBC micro:bit",
                "That's it!"
            ];
            instructions.forEach(function(val, index, arr) {
                var item = document.createElement('li');
                item.setChildren(val);
                list_items.push(item);
            });
            var ordered_list = document.createElement("ol");
            ordered_list.style.fontSize = "18px";
            ordered_list.setChildren(list_items);
            var info_box = div("infobox", [snake_img, header, ordered_list]);
            info_box.style.border = "6px solid #FFCC33";
            info_box.style.background = "#FFFFFF";
            info_box.style.borderRadius = "0px 20px 20px 20px";
            info_box.style.width = "100%";
            info_box.style.padding = "8px";
            info_box.style.marginTop = "32px";
            info_box.style.marginBottom = "64px";
            wrapper.setChildren([info_box]);
        } else {
            elt("externalEditorSide").style.background = "#FFFFFF url(https://az742082.vo.msecnd.net/pub/psopafpj) 0 0 repeat";
            var bbcLogo = div("wallFullScreenLogo", HTML.mkImg(Cloud.config.companyLogoHorizontalUrl));
            var logo = div("wallFullScreenLogo", HTML.mkImg(TheChannel.editor.logoUrl));
            var wrapper = div("wallFullScreenWrapper");
            wrapper.setChildren([w]);
        }
        elt("externalEditorSide").setChildren([bbcLogo, wrapper, logo]);
      }

      public fullWallWidth() {
        return (<HTMLElement> document.querySelector(".wallFullScreenContainer")).offsetWidth;
      }

      public fullWallHeight() {
        return (<HTMLElement> document.querySelector(".wallFullScreenContainer")).offsetHeight;
      }

      public setFullScreenElement(element) {
        (<any> this).fullScreenContainer.setChildren(element);
      }
    }

    function typeCheckAndRunAsync(text: string, mainName = "main") : Promise {
      return Embedded.parseScript(text).then((a: AST.App) => {
        J.setStableId(a);
        // The call to [tcApp] also has the desired side-effect of resolving
        // names.
        // let editors deal with typeerrors
        if (AST.TypeChecker.tcApp(a) > 0) {
            TheChannel.post(<Message_TypeCheck> {
                type: MessageType.TypeCheck,
                ast: AST.Json.dump(a),
            });            
        }
          
        // The compiler expects this global to be set. However, this is
        // dangerous, since the sync code might want to write the *translated*
        // script text to storage for us. Fortunately, the compiler is
        // synchronous, so it shouldn't happen.
        Script = a;
        var compiledScript = AST.Compiler.getCompiledScript(a, {});
        Script = null;
        var rt = TheEditor.currentRt;
        if (!rt)
          rt = TheEditor.currentRt = new Runtime();
        rt.initFrom(compiledScript);
        if (!(rt.host instanceof ExternalHost))
          rt.setHost(new ExternalHost());
        rt.host.currentGuid = ScriptEditorWorldInfo.guid;
        rt.initPageStack();
        // Requires [TheChannel] to be setup properly (so that we know which
        // editor logo to show).
        (<EditorHost> rt.host).showWall();

        //rt.sessions.setEditorScriptContext(Cloud.getUserId(), ScriptEditorWorldInfo.guid, "no name",
        //      TheEditor.getBaseScriptId(), TheEditor.getCurrentAuthorId());

        var main = compiledScript.actionsByName[mainName];
        rt.stopAsync().done(() => {
          rt.run(main, []);
          // So that key events, such as escape, are not caught by Blockly.
          if (document.activeElement instanceof HTMLElement)
            (<HTMLElement> document.activeElement).blur();
        });
      });
    }

    export class Channel {
      constructor(
        public editor: ExternalEditor,
        private iframe: HTMLIFrameElement,
        public guid: string) {
      }

      public post(message: Message) {
        // The notification that the script has been successfully saved
        // to cloud may take a while to arrive; the user may have
        // discarded the editor in the meanwhile.
        if (!this.iframe || !this.iframe.contentWindow)
          return;
        this.iframe.contentWindow.postMessage(message, this.editor.origin);
      }

      public receive(event) {
        if (event.origin != this.editor.origin)
          return;
        Util.log('editor: received ' + JSON.stringify(event, null, 2));
        switch ((<Message> event.data).type) {
            case MessageType.Save: {
            tick(Ticks.externalSave);
            var message = <Message_Save>event.data;
            Util.assert(!!this.guid);
            Promise.join([
              World.getInstalledHeaderAsync(this.guid),
              World.getInstalledScriptAsync(this.guid),
              World.getInstalledEditorStateAsync(this.guid)
            ]).then((res: any[]) => {
              var header: Cloud.Header = <Cloud.Header>res[0];              
              var installedState = JSON.stringify(res);

              var scriptText = message.script.scriptText;
              var editorState = JSON.stringify(message.script.editorState);
              header.scriptVersion.baseSnapshot = message.script.baseSnapshot;
              // This may be over-optimistic (the external editor may serve on
              // top of a version that's already outdated), but the sync code
              // will re-flag the pending merge later on.
              header.pendingMerge = null;

              var metadata = message.script.metadata;
              Object.keys(metadata).forEach(k => {
                var v = metadata[k];
                if (k == "name")
                  v = v || "unnamed";
                header.meta[k] = v;
              });
              // [name] deserves a special treatment because it
              // appears both on the header and in the metadata.
              header.name = metadata.name;

              // don't update if no changes
              var backgroundUpdate = installedState == JSON.stringify([header, scriptText, editorState]);
              var hasChanges = !backgroundUpdate;
              
              // Writes into local storage. Also clears the scriptVersionInCloud
              // field (fifth argument).
              World.updateInstalledScriptAsync(header, scriptText, editorState, backgroundUpdate).then(() => {
                console.log("[external] script saved properly");
                this.post(<Message_SaveAck>{
                  type: MessageType.SaveAck,
                  where: SaveLocation.Local,
                  status: Status.Ok,
                  changed: hasChanges
                });
              });

              // Schedules a cloud sync; set the right state so
              // that [scheduleSaveToCloudAsync] writes the
              // baseSnapshot where we can read it back.
              localStorage["editorScriptToSaveDirty"] = this.guid;
              TheEditor.scheduleSaveToCloudAsync().then((response: Cloud.PostUserInstalledResponse) => {
                // Reading the code of [scheduleSaveToCloudAsync], an early falsy return
                // means that a sync is already scheduled.
                if (!response)
                  return;

                if (response.numErrors) {
                  this.post(<Message_SaveAck>{
                    type: MessageType.SaveAck,
                    where: SaveLocation.Cloud,
                    status: Status.Error,
                    error: (<any> response.headers[0]).error,
                  });
                  // Couldn't sync! Chances are high that we need to do a merge.
                  // Because [syncAsync] is not called on a regular basis when an
                  // external editor is open, we need to trigger the download of
                  // the newer version from the cloud *now*.
                  World.syncAsync().then(() => {
                    World.getInstalledScriptVersionInCloud(this.guid).then((json: string) => {
                      var m: PendingMerge = JSON.parse(json || "{}");
                      if ("theirs" in m) {
                        this.post(<Message_Merge>{
                          type: MessageType.Merge,
                          merge: m
                        });
                      } else {
                        console.log("[external] cloud error was not because of a due merge");
                      }
                    });
                  });
                  return;
                }

                var newCloudSnapshot = response.headers[0].scriptVersion.baseSnapshot;
                console.log("[external] accepted, new cloud version ", newCloudSnapshot);
                // Note: currently, [response.retry] is always false. The reason is,
                // every call of us to [updateInstalledScriptAsync] is immediately
                // followed by a call to [scheduleSaveToCloudAsync]. Furthermore,
                // the latter function has its own tracking mechanism where updates
                // are delayed, and it sort-of knows if it missed an update and
                // should retry. In that case, it doesn't return until the second
                // update has been processed, and we only get called after the cloud
                // is, indeed, in sync. (If we were to offer external editors a way
                // to decide whether to save to cloud or not, then this would no
                // longer be true.)
                this.post(<Message_SaveAck>{
                  type: MessageType.SaveAck,
                  where: SaveLocation.Cloud,
                  status: Status.Ok,
                  newBaseSnapshot: newCloudSnapshot,
                  cloudIsInSync: !response.retry,
                });
              });
            });
            break;
          }

          case MessageType.Quit:
            TheEditor.goToHub("list:installed-scripts:script:"+this.guid+":overview");
            TheChannel = null;
            break;

          case MessageType.Compile:
            tick(Ticks.externalCompile);
            if (TheEditor.useNativeCompilation() && Cloud.anonMode(lf("C++ compilation"))) {
              this.post(<Message_CompileAck>{
                type: MessageType.CompileAck,
                status: Status.Error,
                error: "please log in for compilation"
              });
              return;
            }

            var message1 = <Message_Compile> event.data;

            // Let's abuse the [Language] enum. After the assignment, if
            // [language == CPlusPlus], then this means we want to go the cloud
            // compilation route. Otherwise, if [language == TouchDevelop], it
            // means we want to got the "bitvm" route.
            var compileLanguage, code;
            switch (message1.language) {
              case Language.CPlusPlus:
                // We got C++ in, we therefore want to compile some C++.
                compileLanguage = Language.CPlusPlus;
                code = Promise.as(message1.text);
                break;
              case Language.TouchDevelop:
                fixupLibs(message1.libs);
                // We got a TouchDevelop AST.
                if (AST.allowCppCompiler && message1.text.useCppCompiler) {
                  // The external editor demands C++ compilation. Generate the
                  // C++ code
                  compileLanguage = Language.CPlusPlus;
                  code = roundtrip(message1.text, message1.libs).then((a: J.JApp) => {
                    return Embedded.compile(a);
                  });
                } else {
                  // The external editor is fine with compiling with "bitvm".
                  compileLanguage = Language.TouchDevelop;
                  code = roundtrip1(message1.text, message1.libs);
                }
                break;
            }

            switch (compileLanguage) {
              case Language.CPlusPlus:
                // Native C++ compilation.
                TheEditor.compileWithUi(this.guid, code, message1.name).then(json => {
                  console.log(json);
                  // Aborted because of a retry, perhaps.
                  if (!json)
                    return;

                  if (json.success) {
                    this.post(<Message_CompileAck>{
                      type: MessageType.CompileAck,
                      status: Status.Ok
                    });
                    document.location.href = json.hexurl;
                  } else {
                    var errorMsg = Embedded.makeOutMbedErrorMsg(json);
                    this.post(<Message_CompileAck>{
                      type: MessageType.CompileAck,
                      status: Status.Error,
                      error: errorMsg
                    });
                  }
                }, (json: string) => {
                  // Failure
                  console.log(json);
                  this.post(<Message_CompileAck>{
                    type: MessageType.CompileAck,
                    status: Status.Error,
                    error: "early error"
                  });
                });
                break;

              case Language.TouchDevelop:
                // In-browser "bitvm" compilation.
                code.then((ast: AST.App) => {
                  try {
                    ast.localGuid = this.guid;
                    TheEditor.bytecodeCompileWithUi(ast, { showSource: false, uploader: this.editor.id == "blockly", source: message1.source });
                    this.post(<Message_CompileAck>{
                      type: MessageType.CompileAck,
                      status: Status.Ok
                    });
                  } catch (e) {
                    this.post(<Message_CompileAck>{
                      type: MessageType.CompileAck,
                      status: Status.Error,
                      error: ""+e
                    });
                  }
                });
                break;
            }
            break;

          case MessageType.Upgrade:
            var message2 = <Message_Upgrade> event.data;
            this.receiveUpgrade(message2);
            break;                
                
          case MessageType.Help:
            var msgh = <Message_Help>event.data;
            var path = msgh.path;
            var ptr: JsonPointer;
            var editorSide = elt("externalEditorSide");
            editorSide.setChildren([div("externalEditorHelp", lf("loading..."))]);
            var rt = TheEditor.currentRt;
            var p = rt ? rt.stopAsync() : Promise.as();
            p.then(() => Cloud.getPrivateApiAsync("ptr" + path.replace(/\//g, "-")))
                .then((p: JsonPointer) => {
                    if (!p) return new PromiseInv();
                    ptr = p;
                    return Cloud.getScriptTextAsync(ptr.scriptid);
                }).then((text: string) => {
                    var ht = HelpTopic.fromScriptText(ptr.scriptid, text);
                    var rend = new Renderer();
                    rend.stringLimit = 90;
                    rend.mdComments.useExternalLinks = true;
                    rend.mdComments.showCopy = false;
                    rend.mdComments.forWeb = true;                    
                    return ht.renderAsync(rend.mdComments);
                }).done((html:string) => {
                    var doc = div("externalEditorHelp");
                    Browser.setInnerHTML(doc, html);
                    if (editorSide.offsetWidth == 0) {
                        var m = new ModalDialog();
                        m.add(doc);
                        m.stretchWide();
                        m.setScroll();
                        m.addOk();
                        m.show();                
                    } else {
                        editorSide.setChildren([doc]);
                        editorSide.classList.remove("dismissed");                
                    }
                }, e => {
                    Util.reportError("help", e, false);
                    editorSide.setChildren([div("externalEditorHelp",lf("oops, could not load the documentation."))]);
                    window.open(path);
                });                
            break;
          case MessageType.Run:
            tick(Ticks.externalRun);
            var message3 = <Message_Run> event.data;
            var side = document.getElementById("externalEditorSide");
            if (message3.onlyIfSplit && side.offsetWidth == 0)
              break;
            side.classList.remove("dismissed");
            // So that key events such as escape are caught by the editor, not
            // the inner iframe.
            var ast: AST.Json.JApp = message3.ast;
            fixupLibs(message3.libs);
            addLibraries(ast, message3.libs)
            .then(() => {
              var text = J.serialize(ast);
              return typeCheckAndRunAsync(text);
            }).done();
            break;

          case MessageType.Load:
            tick(Ticks.externalLoad);
            var message4 = <Message_Load> event.data;
            ArtUtil.handleImportFilesAsync([message4.file]).done();
            break;

          default:
            // Apparently the runtime loop of the simulator is implemented using
            // messages sent to all origins... see [rt/util.ts]. So just don't do
            // anything if we receive an unrecognized message.
            break;
        }
      }
      
      private receiveUpgrade(message2: Message_Upgrade) {
            var ast: AST.Json.JApp = message2.ast;
            fixupLibs(message2.libs);
            addLibraries(ast, message2.libs).then(() => {;
              console.log("Attempting to serialize", ast);
              var text = J.serialize(ast);
              console.log("Attempting to edit script text", text);                            
              
              var m = new ModalDialog();
              m.add(div('wall-dialog-header', lf("here is your code")))
              m.add(div('wall-dialog-body',
                lf("By dragging and placing blocks, you've created the following code.")))
              var preview = div('');              
              m.add(preview);
              Embedded.parseScript(text)
                .done((app: AST.App) => {
                  var main = app.mainAction();
                  var r = new Renderer();
                  Browser.setInnerHTML(preview, r.dispatch(main));
                });    
              m.add(div('wall-dialog-buttons', [
                HTML.mkButton(lf("convert"), () => {
                  m.dismiss();
                  Browser.TheHost.openNewScriptAsync({
                    editorName: "touchdevelop",
                    scriptName: message2.name,
                    scriptText: text
                  }).done(() => {
                    // Release focus, kill the channel.
                    if (document.activeElement instanceof HTMLElement)
                      (<HTMLElement> document.activeElement).blur();
                    TheChannel = null;
                  });                  
                }),
                HTML.mkButton(lf("cancel"), () => m.dismiss())
              ]))
              m.setScroll();
              m.show();              
            }).done();        
      }
    }    

    export interface ScriptData {
      guid: string;
      scriptText: string;
      editorState: EditorState;
      scriptVersionInCloud: string;
      baseSnapshot: string;
      metadata: Metadata;
      pubId: string;
    };

    window.addEventListener("resize", () => {
      if (TheChannel)
        TheChannel.post({
          type: MessageType.Resized,
        });
    });

    // The [scriptVersionInCloud] name is the one that's used by [world.ts];
    // actually, it hasn't much to do, really, with the script version
    // that's in the cloud. It's more of an unused field (in the new "lite
    // cloud" context) that we use to store extra information attached to
    // the script.
    export function loadAndSetup(editor: ExternalEditor, data: ScriptData) {
      // The [scheduleSaveToCloudAsync] method on [Editor] needs the
      // [guid] field of this global to match for us to read back the
      // [baseSnapshot] field afterwards.
      ScriptEditorWorldInfo = <EditorWorldInfo>{
        guid: data.guid,
        baseId: null,
        baseUserId: null,
        status: null,
        version: null,
        baseSnapshot: null,
      };

      Ticker.setCurrentEditorId(editor.id);

      // Clear leftover iframes and simulators.
      var editorSide = elt("externalEditorSide");
      editorSide.setChildren([]);
      var iframeDiv = elt("externalEditorFrame");
      iframeDiv.setChildren([]);

      // Load the editor; send the initial message.
      var iframe = document.createElement("iframe");
      // allow-popups is for the Blockly help menu item; allow-modals is for the
      // rename variable prompt
      iframe.setAttribute("sandbox", "allow-modals allow-scripts allow-same-origin allow-popups");
      iframe.addEventListener("load", () => {
        TheChannel = new Channel(editor, iframe, data.guid);

        // Start the simulator. This assumes that [TheChannel] is properly
        // setup.
        pullLatestLibraryVersion(microbitScriptId)
        .then((pubId: string) => ScriptCache.getScriptAsync(pubId))
        .then((s: string) => typeCheckAndRunAsync(s, "_libinit"))
        .done(() => {
          // Send the initialization message once the simulator is properly
          // setup.
          var extra = JSON.parse(data.scriptVersionInCloud || "{}");
          TheChannel.post(<Message_Init> {
            type: MessageType.Init,
            script: data,
            merge: ("theirs" in extra) ? extra : null,
            fota: Cloud.isFota(),
            pubId: data.pubId,
          });
        });
      });
      iframe.setAttribute("src", editor.origin + editor.path);
      iframeDiv.appendChild(iframe);

      // Change the hash and the window title.
      TheEditor.historyMgr.setHash("edit:" + data.guid, editor.name);
    }

    export function pickUpNewBaseVersion() {
      if (TheChannel)
        TheChannel.post(<Message_NewBaseVersion> {
          type: MessageType.NewBaseVersion,
          baseSnapshot: ScriptEditorWorldInfo.baseSnapshot
        });
    }
  }
}

// vim: set ts=2 sw=2 sts=2:
