///<reference path='../../editor/messages.ts'/>
///<reference path='blockly.d.ts'/>
///<reference path='compiler.ts'/>

module TDev {

  // ---------- Communication protocol

  var allowedOrigins = [
    /^http:\/\/localhost/,
    /^https?:\/\/.*\.microbit\.co\.uk/,
    /^https?:\/\/microbit\.co\.uk/,
  ];

  function isAllowedOrigin(origin: string) {
    return allowedOrigins.filter(x => !!origin.match(x)).length > 0;
  }

  var $ = (s: string) => <HTMLElement> document.querySelector(s);

  // Both of these are written once when we receive the first (trusted)
  // message.
  var outer: Window = null;
  var origin: string = null;

  // A global that remembers the current version we're editing
  var currentVersion: string;
  var inMerge: boolean = false;

  window.addEventListener("message", (event) => {
    if (!isAllowedOrigin(event.origin)) {
      console.error("[inner message] not from the right origin!", event.origin);
      return;
    }

    if (!outer || !origin) {
      outer = event.source;
      origin = event.origin;
    }

    receive(<External.Message>event.data);
  });

  function receive(message: External.Message) {
    console.log("[inner message]", message);

    switch (message.type) {
      case External.MessageType.Init:
        setupEditor(<External.Message_Init> message);
        setupButtons();
        setupCurrentVersion(<External.Message_Init> message);
        break;

      case External.MessageType.SaveAck:
        saveAck(<External.Message_SaveAck> message);
        break;

      case External.MessageType.Merge:
        promptMerge((<External.Message_Merge> message).merge);
        break;

      case External.MessageType.CompileAck:
        compileAck(<External.Message_CompileAck> message);
    }
  }

  function post(message: External.Message) {
    if (!outer)
      console.error("Invalid state");
    outer.postMessage(message, origin);
  }

  // ---------- Revisions

  function prefix(where: External.SaveLocation) {
    switch (where) {
      case External.SaveLocation.Cloud:
        return("☁  [cloud]");
      case External.SaveLocation.Local:
        return("⌂ [local]");
    }
  }

  function saveAck(message: External.Message_SaveAck) {
    switch (message.status) {
      case External.Status.Error:
        statusMsg(prefix(message.where)+" error: "+message.error, message.status);
        break;
      case External.Status.Ok:
        if (message.where == External.SaveLocation.Cloud) {
          statusMsg(prefix(message.where)+" successfully saved version (cloud in sync? "+
            message.cloudIsInSync +", "+
            "from "+currentVersion+" to "+message.newBaseSnapshot+")",
            message.status);
          currentVersion = message.newBaseSnapshot;
        } else {
          statusMsg(prefix(message.where)+" successfully saved", message.status);
        }
        break;
    }
  }

  function compileAck(message: External.Message_CompileAck) {
    switch (message.status) {
      case External.Status.Error:
        statusMsg("compilation error: "+message.error, message.status);
        break;
      case External.Status.Ok:
        statusMsg("compilation successful", message.status);
        break;
    }
  }

  function promptMerge(merge: External.PendingMerge) {
    console.log("[merge] merge request, base = "+merge.base.baseSnapshot +
      ", theirs = "+merge.theirs.baseSnapshot +
      ", mine = "+currentVersion);
    var mkButton = function (symbol: string, label: string, f: () => void) {
      var b = document.createElement("a");
      b.classList.add("roundbutton");
      b.setAttribute("href", "#");
      var s = document.createElement("div");
      s.classList.add("roundsymbol");
      s.textContent = symbol;
      b.appendChild(s);
      var l = document.createElement("div");
      l.classList.add("roundlabel");
      l.textContent = label;
      b.appendChild(l);
      b.addEventListener("click", f);
      return b;
    };
    var box = $("#merge-commands");
    var clearMerge = () => {
      while (box.firstChild)
        box.removeChild(box.firstChild);
    };
    var mineText = saveBlockly();
    var mineName = getName();
    var mineDescription = getDescription();
    var mineButton = mkButton("🔍", "see mine", () => {
      loadBlockly(mineText);
      setName(mineName);
      setDescription(mineDescription);
    });
    var theirsButton = mkButton("🔍", "see theirs", () => {
      loadBlockly(merge.theirs.scriptText);
      setName(merge.theirs.metadata.name);
      setDescription(merge.theirs.metadata.description);
    });
    var baseButton = mkButton("🔍", "see base", () => {
      loadBlockly(merge.base.scriptText);
      setName(merge.base.metadata.name);
      setDescription(merge.base.metadata.description);
    });
    var mergeButton = mkButton("👍", "finish merge", () => {
      inMerge = false;
      currentVersion = merge.theirs.baseSnapshot;
      clearMerge();
      doSave();
    });
    clearMerge();
    inMerge = true;
    [ mineButton, theirsButton, baseButton, mergeButton ].forEach(button => {
      box.appendChild(button);
      box.appendChild(document.createTextNode(" "));
    });
  }

  function setupCurrentVersion(message: External.Message_Init) {
    currentVersion = message.script.baseSnapshot;
    console.log("[revisions] current version is "+currentVersion);

    if (message.merge)
      promptMerge(message.merge);
  }

  // ---------- UI functions

  interface EditorState {
    lastSave: Date;
  }

  function statusMsg(s: string, st: External.Status) {
    var box = <HTMLElement> $("#log");
    var elt = document.createElement("div");
    elt.classList.add("status");
    if (st == External.Status.Error)
      elt.classList.add("error");
    else
      elt.classList.remove("error");
    elt.textContent = s;
    box.appendChild(elt);
    box.scrollTop = box.scrollHeight;
  }

  function loadBlockly(s: string) {
    var text = s || "<xml></xml>";
    var xml = Blockly.Xml.textToDom(text);
    Blockly.mainWorkspace.clear();
    try {
      Blockly.Xml.domToWorkspace(Blockly.mainWorkspace, xml);
    } catch (e) {
      console.error("Cannot load saved Blockly script. Too recent?");
      console.error(e);
    }
  }

  function saveBlockly(): string {
    var xml = Blockly.Xml.workspaceToDom(Blockly.mainWorkspace);
    var text = Blockly.Xml.domToPrettyText(xml);
    return text;
  }

  function setDescription(x: string) {
    (<HTMLInputElement> $("#script-description")).value = (x || "");
  }

  function setName(x: string) {
    (<HTMLInputElement> $("#script-name")).value = x;
  }

  function getDescription() {
    return (<HTMLInputElement> $("#script-description")).value;
  }

  function getName() {
    return (<HTMLInputElement> $("#script-name")).value;
  }

  var dirty = false;

  // Called once at startup
  function setupEditor(message: External.Message_Init) {
    var state = <MyEditorState> message.script.editorState;

    Blockly.inject($("#editor"), {
      toolbox: $("#blockly-toolbox"),
      scrollbars: false
    });
    loadBlockly(message.script.scriptText);
    // Hack alert! Blockly's [fireUiEvent] function [setTimeout]'s (with a 0 delay) the actual
    // firing of the event, meaning that the call to [inject] above schedule a change event to
    // be fired immediately after the current function is done. To make sure our change handler
    // does not receive that initial event, we schedule it for slightly later.
    window.setTimeout(() => {
      Blockly.addChangeListener(() => {
        statusMsg("✎ local changes", External.Status.Ok);
        dirty = true;
      });
    }, 1);
    $("#script-name").addEventListener("input", () => {
      statusMsg("✎ local changes", External.Status.Ok);
      dirty = true;
    });
    $("#script-description").addEventListener("input", () => {
      statusMsg("✎ local changes", External.Status.Ok);
      dirty = true;
    });

    setName(message.script.metadata.name);
    setDescription(message.script.metadata.description);

    // That's triggered when the user closes or reloads the whole page, but
    // doesn't help if the user hits the "back" button in our UI.
    window.addEventListener("beforeunload", function (e) {
      if (dirty) {
        var confirmationMessage = "Some of your changes have not been saved. Quit anyway?";
        (e || window.event).returnValue = confirmationMessage;
        return confirmationMessage;
      }
    });

    window.setInterval(() => {
      doSave();
    }, 5000);

    console.log("[loaded] cloud version " + message.script.baseSnapshot +
      "(dated from: "+state.lastSave+")");
  }

  interface MyEditorState extends External.EditorState {
      lastSave: Date
  }

  function doSave(force = false) {
    if (!dirty && !force)
      return;

    var text = saveBlockly();
    console.log("[saving] on top of: ", currentVersion);
    post(<External.Message_Save>{
      type: External.MessageType.Save,
      script: {
        scriptText: text,
        editorState: <MyEditorState> {
          // XXX test values
          // tutorialStep: 1,
          // tutorialNumSteps: 10,
          lastSave: new Date()
        },
        baseSnapshot: currentVersion,
        metadata: {
          name: getName(),
          description: getDescription()
        }
      },
    });
    dirty = false;
  }

  function compileOrError(wantErrors: boolean) {
    var ast: TDev.AST.Json.JApp;

    // Clear any previous errors
    var clear = (c: string) => {
      var elts = document.getElementsByClassName(c);
      // Argh! It's alive!
      for (var i = elts.length - 1; i >= 0; --i)
        (<any> elts[i]).classList.remove(c);
    };
    clear("blocklySelected");
    clear("blocklyError");
    $("#errors").classList.add("hidden");

    try {
      ast = compile(Blockly.mainWorkspace, {
        name: getName(),
        description: getDescription()
      });
    } catch (e) {
      statusMsg("⚠ compilation error: "+e, External.Status.Error);
    }

    var errors = Errors.get();
    if (errors.length && wantErrors) {
      $("#errors").classList.remove("hidden");
      var text = "";
      errors.forEach((e: Errors.CompilationError) => {
        var block = e.block;
        (<any> block.svgGroup_).classList.add("blocklySelected");
        (<any> block.svgGroup_).classList.add("blocklyError");
        text += e.msg + "\n";
      });
      $("#errorsText").textContent = text;
      statusMsg("⚠ compilation errors", External.Status.Error);
      return null;
    }

    return ast;
  }

  function doGraduate(wantErrors: boolean) {
    var ast = compileOrError(wantErrors);
    if (!ast)
      return;
    post(<External.Message_Upgrade> {
      type: External.MessageType.Upgrade,
      ast: ast,
      name: getName()+" (converted)",
    });
  }

  function doCompile(wantErrors: boolean) {
    var ast = compileOrError(wantErrors);
    if (!ast)
      return;
    post(<External.Message_Compile> {
      type: External.MessageType.Compile,
      text: ast,
      language: External.Language.TouchDevelop
    });
  }

  function setupButtons() {
    $("#command-quit").addEventListener("click", () => {
      doSave();
      post({ type: External.MessageType.Quit });
    });
    $("#command-force-compile").addEventListener("click", () => {
      doCompile(false);
    });
    $("#command-compile").addEventListener("click", () => {
      $("#command-force-graduate").classList.add("hidden");
      $("#command-force-compile").classList.remove("hidden");
      doCompile(true);
    });
    $("#command-force-graduate").addEventListener("click", () => {
      doGraduate(false);
    });
    $("#command-graduate").addEventListener("click", () => {
      $("#command-force-graduate").classList.remove("hidden");
      $("#command-force-compile").classList.add("hidden");
      doGraduate(true);
    });
    $("#command-run").addEventListener("click", () => {
      var ast = compileOrError(false);
      post(<External.Message_Run> {
        type: External.MessageType.Run,
        ast: <any> ast,
      });
    });
  }
}

// vim: set ts=2 sw=2 sts=2:
