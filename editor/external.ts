///<reference path='refs.ts'/>

module TDev {
  export interface ExternalEditor {
    // 3 ields are for our UI
    company: string;
    name: string;
    description: string;
    // Unique
    id: string;
    // The domain root for the external editor.
    origin: string;
    // The path from the domain root to the editor main document.
    path: string;
  }

  var externalEditorsCache: ExternalEditor[] = null;

  export function getExternalEditors(): ExternalEditor[] {
    if (!externalEditorsCache) {
      // Detect at run-time where we're running from!
      var url = Ticker.mainJsName.replace(/main.js$/, "");
      var match = url.match(/(https?:\/\/[^\/]+)(.*)/);
      var origin = match[1];
      var path = match[2];
      externalEditorsCache = [ /* {
        name: "C++ Editor",
        description: "Directly write C++ code using Ace (OUTDATED)",
        id: "ace",
        origin: origin,
        path: path + "ace/editor.html"
        icon: ""
      }, */ {
        company: "Microsoft Research",
        name: "Blocks",
        description: "Drag and drop",
        id: "blockly",
        origin: origin,
        path: path + "blockly/editor.html"
      }];
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
    // [initAsync] will find the latest version of this script by walking up the
    // update chain, but in order to save on some API calls, this script id
    // should be refreshed at regular intervals.
    export var deviceScriptId = "lwhfye";
    export var deviceLibraryName = "micro:bit";

    import J = AST.Json;

    export function makeOutMbedErrorMsg(json: any) {
      var errorMsg = "unknown error";
      // This JSON format is *very* unstructured...
      if (json.mbedresponse) {
        var messages = json.messages.filter(m =>
          m.severity == "error" || m.type == "Error"
        );
        errorMsg = messages.map(m => m.message + "\n" + m.text).join("\n");
      }
      return errorMsg;
    }

    export function pullLatestLibraryVersion(): Promise { // of nothing
      var r = new PromiseInv()

      var set = (script: JsonScript) => {
          if (!script || !r.isPending()) return
          deviceScriptId = script.updateid;
          r.success(null)
      }

      Browser.TheApiCacheMgr.getAsync(deviceScriptId, false)
        .then(set)
        .done()

      // in case the one above fails, we also try the stale one from the cache
      Browser.TheApiCacheMgr.getAsync(deviceScriptId, true)
          .then(() => Promise.delay(2000))
          .then(set)
          .done()

      return r
    }

    // This function modifies its argument by adding an extra [J.JLibrary]
    // to its [decls] field that references the device's library.
    function addDeviceLibrary(app: J.JApp) {
      var lib = <AST.LibraryRef> AST.Parser.parseDecl(
        'meta import ' + AST.Lexer.quoteId(deviceLibraryName) + ' {' +
        '  pub "' + deviceScriptId + '"'+
        '}'
      );
      var jLib = <J.JLibrary> J.addIdsAndDumpNode(lib);
      // There's an implicit convention here. The external editor needs to
      // generate references to the device library (to talk about the image
      // type, for instance), but doesn't know yet which id will be assigned to
      // it. So both the external editor and this module agree on a common id.
      jLib.id = "__DEVICE__";
      app.decls.push(jLib);
    }

    function parseScript(text: string): Promise { // of AST.App
      return AST.loadScriptAsync((id: string) => {
        if (id == "")
          return Promise.as(text);
        else
          return World.getAnyScriptAsync(id);
      }, "").then((resp: AST.LoadScriptResult) => {
        // Otherwise, eventually, this will result in our script being
        // saved in the TouchDevelop format...
        var s = Script;
        Script = null;
        // The function writes its result in a global
        return Promise.as(s);
      });
    }

    // Takes a [JApp] and runs its through various hoops to make sure
    // everything is type-checked and resolved properly.
    function roundtrip(a: J.JApp): Promise { // of J.JApp
      addDeviceLibrary(a);
      var text = J.serialize(a);
      return parseScript(text).then((a: AST.App) => {
        if (AST.TypeChecker.tcApp(a) > 0) {
          throw new Error("We received a script with errors and cannot compile it. " +
              "Try converting then fixing the errors manually.");
        }
        return Promise.as(J.dump(a)); });
    }

    class ExternalHost extends EditorHost {
      public updateButtonsVisibility() {
      }

      public showWall() {
        super.showWall();
        document.getElementById("wallOverlay").style.display = "none";
        var w = <HTMLElement> document.querySelector(".wallFullScreenContainer");
        w.style.height = "100%";
        w.style.display = "";
        var logo = div("wallFullScreenLogo", HTML.mkImg(Cloud.artUrl("hrztfaux")));

        elt("externalEditorSide").setChildren([w, logo]);        
      }

      public fullWallWidth() {
        return (<HTMLElement> document.querySelector(".wallFullScreenContainer")).offsetWidth;
      }

      public fullWallHeight() {
        return (<HTMLElement> document.querySelector(".wallFullScreenContainer")).offsetHeight;
      }
    }

    function typeCheckAndRun(text: string, mainName = "main") {
      parseScript(text).then((a: AST.App) => {
        J.setStableId(a);
        // The call to [tcApp] also has the desired side-effect of resolving
        // names.
        if (AST.TypeChecker.tcApp(a) > 0) {
            ModalDialog.info(lf("Type-checking error"),
              lf("We received a script with errors and cannot run it. Try converting then fixing the errors manually."));
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
        rt.initPageStack();
        (<EditorHost> rt.host).showWall();

        var main = compiledScript.actionsByName[mainName];
        rt.stopAsync().done(() => {
          rt.run(main, []);
        });
      });
    }

    export function mkChannelAsync(
      editor: ExternalEditor,
      iframe: HTMLIFrameElement,
      guid: string): Promise // of Channel
    {
      return pullLatestLibraryVersion().then(() => new Channel(editor, iframe, guid));
    }

    export class Channel {
      constructor(
        private editor: ExternalEditor,
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

        switch ((<Message> event.data).type) {
          case MessageType.Save: {
            var message = <Message_Save> event.data;
            World.getInstalledHeaderAsync(this.guid).then((header: Cloud.Header) => {
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

              // Writes into local storage. Also clears the scriptVersionInCloud
              // field (fifth argument).
              World.updateInstalledScriptAsync(header, scriptText, editorState, false, "").then(() => {
                console.log("[external] script saved properly");
                this.post(<Message_SaveAck>{
                  type: MessageType.SaveAck,
                  where: SaveLocation.Local,
                  status: Status.Ok,
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
            if (Cloud.anonMode(lf("Native compilation")))
              return;

            var message1 = <Message_Compile> event.data;
            var cpp;
            switch (message1.language) {
              case Language.CPlusPlus:
                cpp = Promise.as(message1.text);
                break;
              case Language.TouchDevelop:
                cpp = roundtrip(message1.text).then((a: J.JApp) => {
                  return Embedded.compile(a);
                });
                break;
            }
            TheEditor.compileWithUi(this.guid, cpp, message1.name).then(json => {
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
                var errorMsg = makeOutMbedErrorMsg(json);
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

          case MessageType.Upgrade:
            var message2 = <Message_Upgrade> event.data;
            var ast: AST.Json.JApp = message2.ast;
            addDeviceLibrary(ast);
            console.log("Attempting to serialize", ast);
            var text = J.serialize(ast);
            console.log("Attempting to edit script text", text);
            Browser.TheHost.openNewScriptAsync({
              editorName: "touchdevelop",
              scriptName: message2.name,
              scriptText: text
            }).done();
            break;

          case MessageType.Run:
            var message3 = <Message_Run> event.data;
            var ast: AST.Json.JApp = message3.ast;
            addDeviceLibrary(ast);
            var text = J.serialize(ast);
            typeCheckAndRun(text);
            break;

          default:
            // Apparently the runtime loop of the simulator is implemented using
            // messages on any origins... see [rt/util.ts]. So just don't do
            // anything if we receive an unrecognized message.
            break;
        }
      }
    }

    export interface ScriptData {
      guid: string;
      scriptText: string;
      editorState: EditorState;
      scriptVersionInCloud: string;
      baseSnapshot: string;
      metadata: Metadata;
    };

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

      // Clear leftover iframes and simulators.
      document.getElementById("externalEditorSide").setChildren([]);
      var iframeDiv = document.getElementById("externalEditorFrame");
      iframeDiv.setChildren([]);

      // Load the editor; send the initial message.
      var iframe = document.createElement("iframe");
      // allow-popups is for the Blockly help menu item
      iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups");
      iframe.addEventListener("load", function () {
        mkChannelAsync(editor, iframe, data.guid).done((channel: Channel) => {
          TheChannel = channel;
          var extra = JSON.parse(data.scriptVersionInCloud || "{}");
          TheChannel.post(<Message_Init> {
            type: MessageType.Init,
            script: data,
            merge: ("theirs" in extra) ? extra : null
          });
        });
      });
      iframe.setAttribute("src", editor.origin + editor.path);
      iframeDiv.appendChild(iframe);

      // Change the hash and the window title.
      TheEditor.historyMgr.setHash("edit:" + data.guid, editor.name);

      // Start the simulator
      pullLatestLibraryVersion()
      .then(() => ScriptCache.getScriptAsync(deviceScriptId))
      .then((s: string) => {
        typeCheckAndRun(s, "_libinit");
      })
      .done();
    }

    export function pickUpNewBaseVersion() {
      TheChannel.post(<Message_NewBaseVersion> {
        type: MessageType.NewBaseVersion,
        baseSnapshot: ScriptEditorWorldInfo.baseSnapshot
      });
    }
  }
}

// vim: set ts=2 sw=2 sts=2:
