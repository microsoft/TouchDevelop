///<reference path='../../editor/messages.ts'/>
///<reference path='blockly.d.ts'/>
///<reference path='../../typings/jquery/jquery.d.ts'/>
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
        break;

      case External.MessageType.NewBaseVersion:
        newBaseVersion(<External.Message_NewBaseVersion> message);
        break;
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

  function statusIcon(icon: string) {
    var i = $("#cloud-status i");
    i.attr("class", "fa fa-"+icon);
    switch (icon) {
      case "cloud-upload":
        i.attr("title", "Saved to cloud");
        break;
      case "floppy-o":
        i.attr("title", "Saved locally");
        break;
      case "exclamation-triangle":
        i.attr("title", "Error while saving -- see ⓘ for more information");
        break;
      case "pencil":
        i.attr("title", "Local changes");
        break;
      default:
        i.attr("title", "");
    }
  }

  function saveAck(message: External.Message_SaveAck) {
    switch (message.status) {
      case External.Status.Error:
        statusMsg(prefix(message.where)+" error: "+message.error, message.status);
        statusIcon("exclamation-triangle");
        break;
      case External.Status.Ok:
        if (message.where == External.SaveLocation.Cloud) {
          statusMsg(prefix(message.where)+" successfully saved version (cloud in sync? "+
            message.cloudIsInSync +", "+
            "from "+currentVersion+" to "+message.newBaseSnapshot+")",
            message.status);
          currentVersion = message.newBaseSnapshot;
          if (message.cloudIsInSync)
            statusIcon("cloud-upload");
          else
            statusIcon("exclamation-triangle");
        } else {
          statusIcon("floppy-o");
          statusMsg(prefix(message.where)+" successfully saved", message.status);
        }
        break;
    }
  }

  function compileAck(message: External.Message_CompileAck) {
    $("#command-compile > .roundsymbol").removeClass("compiling");
    switch (message.status) {
      case External.Status.Error:
        statusMsg("compilation error: "+message.error, message.status);
        showPopup($("#link-log"), $("#popup-log"));
        break;
      case External.Status.Ok:
        statusMsg("compilation successful", message.status);
        break;
    }
  }

  var mergeDisabled = true;

  function newBaseVersion(msg: External.Message_NewBaseVersion) {
    statusMsg("✎ got assigned our first base version", External.Status.Ok);
    // We've been assigned a base version number for the first time. All further
    // save messages will be on top of that current version.
    currentVersion = msg.baseSnapshot;
  }

  function promptMerge(merge: External.PendingMerge) {
    if (mergeDisabled) {
      inMerge = false;
      currentVersion = merge.theirs.baseSnapshot;
      statusMsg("✎ ignoring merge, forcing changes", External.Status.Ok);
      doSave(true);
      return;
    }

    console.log("[merge] merge request, base = "+merge.base.baseSnapshot +
      ", theirs = "+merge.theirs.baseSnapshot +
      ", mine = "+currentVersion);
    var mkButton = function (symbol: string, label: string, f: () => void) {
      return $("<div>").text(symbol+" "+label).click(f);
    };
    var box = $("#merge-commands");
    var clearMerge = () => {
      box.empty();
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
      setDescription(merge.theirs.metadata.comment);
    });
    var baseButton = mkButton("🔍", "see base", () => {
      loadBlockly(merge.base.scriptText);
      setName(merge.base.metadata.name);
      setDescription(merge.base.metadata.comment);
    });
    var mergeButton = mkButton("👍", "finish merge", () => {
      inMerge = false;
      currentVersion = merge.theirs.baseSnapshot;
      clearMerge();
      doSave(true);
    });
    clearMerge();
    inMerge = true;
    box.append($("<div>").addClass("label").text("Merge conflict"));
    [ mineButton, theirsButton, baseButton, mergeButton ].forEach(button => {
      box.append(button);
      box.append($(" "));
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
    var box = $("#log");
    var elt = $("<div>").addClass("status").text(s);
    if (st == External.Status.Error)
      elt.addClass("error");
    else
      elt.removeClass("error");
    box.append(elt);
    box.scrollTop(box.prop("scrollHeight"));
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
    $("#script-description").text(x);
  }

  function setName(x: string) {
    $("#script-name").text(x);
  }

  function getDescription() {
    return $("#script-description").text();
  }

  function getName() {
    return $("#script-name").text();
  }

  var dirty = false;

  /* Some popup routines... */
  function clearPopups() {
    $(".popup").addClass("hidden");
  }
  function setupPopups() {
    /* Hide all popups when user clicks elsewhere. */
    $(document).click(clearPopups);
    /* Catch clicks on popups themselves to disable above handler. */
    $(".popup").click((e: Event) => {
      e.stopPropagation();
    });
  }

  function setupPopup(link: JQuery, popup: JQuery) {
    link.click((e: Event) => {
      if (popup.hasClass("hidden"))
        showPopup(link, popup);
      else
        popup.addClass("hidden");
      e.stopPropagation();
    });
  }

  function showPopup(link: JQuery, popup: JQuery) {
    clearPopups();
    popup.removeClass("hidden");
    var x = link[0].offsetLeft;
    var w = link[0].clientWidth;
    var y = link[0].offsetTop;
    var h = link[0].clientHeight;
    popup.css("left", Math.round(x - 500 + w/2 + 5 + 15)+"px");
    popup.css("top", Math.round(y + h + 10 + 5)+"px");
  }

  // Called once at startup
  function setupEditor(message: External.Message_Init) {
    var state = <MyEditorState> message.script.editorState;

    Blockly.inject($("#editor")[0], {
      toolbox: $("#blockly-toolbox")[0],
      scrollbars: true
    });
    loadBlockly(message.script.scriptText);
    // Hack alert! Blockly's [fireUiEvent] function [setTimeout]'s (with a 0 delay) the actual
    // firing of the event, meaning that the call to [inject] above schedule a change event to
    // be fired immediately after the current function is done. To make sure our change handler
    // does not receive that initial event, we schedule it for slightly later.
    window.setTimeout(() => {
      Blockly.addChangeListener(() => {
        statusMsg("✎ local changes", External.Status.Ok);
        statusIcon("pencil");
        dirty = true;
      });
    }, 1);
    $("#script-name").on("input keyup blur", () => {
      statusMsg("✎ local changes", External.Status.Ok);
      statusIcon("pencil");
      dirty = true;
    });
    $("#script-description").on("input keyup blur", () => {
      statusMsg("✎ local changes", External.Status.Ok);
      statusIcon("pencil");
      dirty = true;
    });

    setName(message.script.metadata.name);
    setDescription(message.script.metadata.comment);
    if (!message.script.baseSnapshot && !message.script.metadata.comment)
      setDescription("A #blocks script");

    // That's triggered when the user closes or reloads the whole page, but
    // doesn't help if the user hits the "back" button in our UI.
    window.addEventListener("beforeunload", e => {
      if (dirty) {
        var confirmationMessage = "Some of your changes have not been saved. Quit anyway?";
        (e || window.event).returnValue = confirmationMessage;
        return confirmationMessage;
      }
    });

    window.setInterval(() => {
      doSave();
    }, 5000);

    setupPopup($("#link-log"), $("#popup-log"));
    setupPopups();

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
          comment: getDescription()
        }
      },
    });
    dirty = false;
  }

  function compileOrError(msgSel?: string) {
    var ast: TDev.AST.Json.JApp;

    $(".blocklySelected, .blocklyError").attr("class", "");
    clearPopups();
    $("#errorsGraduate").addClass("hidden");
    $("#errorsCompile").addClass("hidden");

    try {
      ast = compile(Blockly.mainWorkspace, {
        name: getName(),
        description: getDescription()
      });
    } catch (e) {
      statusMsg("⚠ compilation error: "+e, External.Status.Error);
      showPopup($("#link-log"), $("#popup-log"));
    }

    var errors = Errors.get();
    if (errors.length && msgSel) {
      var text = "";
      errors.forEach((e: Errors.CompilationError) => {
        var block = e.block;
        $(block.svgGroup_).attr("class", "blocklySelected blocklyError");
        text += e.msg + "\n";
      });
      statusMsg(text, External.Status.Error);
      $(msgSel).removeClass("hidden");
      showPopup($("#link-log"), $("#popup-log"));
      return null;
    }

    return ast;
  }

  function doGraduate(msgSel?: string) {
    var ast = compileOrError(msgSel);
    if (!ast)
      return;
    post(<External.Message_Upgrade> {
      type: External.MessageType.Upgrade,
      ast: ast,
      name: getName()+" (converted)",
    });
  }

  function doCompile(msgSel?: string) {
    var ast = compileOrError(msgSel);
    if (!ast)
      return;
    $("#command-compile > .roundsymbol").addClass("compiling");
    post(<External.Message_Compile> {
      type: External.MessageType.Compile,
      text: ast,
      language: External.Language.TouchDevelop,
      name: getName(),
    });
  }

  function setupButtons() {
    $("#command-quit").click(() => {
      doSave();
      post({ type: External.MessageType.Quit });
    });
    $("#command-force-compile").click(() => {
      doCompile();
    });
    $("#command-compile").click((e: Event) => {
      doCompile("#errorsCompile");
      e.stopPropagation();
    });
    $("#command-force-graduate").click(() => {
      doGraduate();
    });
    $("#command-graduate").click((e: Event) => {
      doGraduate("#errorsGraduate");
      e.stopPropagation();
    });
    $("#command-run").click(() => {
      var ast = compileOrError();
      post(<External.Message_Run> {
        type: External.MessageType.Run,
        ast: <any> ast,
      });
    });
  }
}

// vim: set ts=2 sw=2 sts=2:
