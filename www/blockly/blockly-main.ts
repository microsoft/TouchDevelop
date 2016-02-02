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

  function debounce(func : () => void, wait : number, immediate : boolean) : () => void {
    var timeout : any;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  }

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

  var onResize = () => {};
  
  function receive(message: External.Message) {
    console.log("[inner message]", message);

    switch (message.type) {
      case External.MessageType.Init:
        setupEditor(<External.Message_Init> message);
        setupButtons();
        setupCurrentVersion(<External.Message_Init> message);
        break;

      case External.MessageType.Resized:
        onResize();
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
      case External.MessageType.TypeCheck:
        typeCheckError(<External.Message_TypeCheck>message);
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
          statusMsg(prefix(message.where) + " successfully saved version (cloud in sync? " +
            message.cloudIsInSync + ", " +
            "from " + currentVersion + " to " + message.newBaseSnapshot + ")",
            message.status);
          currentVersion = message.newBaseSnapshot;
          if (message.cloudIsInSync)
            statusIcon("cloud-upload");
          else
            statusIcon("exclamation-triangle");
        } else {
          statusIcon("floppy-o");
          statusMsg(prefix(message.where) + " successfully saved", message.status);
        }

        // if (message.changed) {
        //  statusMsg("changes detected, running...", message.status);
        //  doRun(true);
        // }        
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

  function typeCheckError(msg: External.Message_TypeCheck) {      
    statusMsg("! your script has errors", External.Status.Error);
  }
    
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
    var mineButton = mkButton("🔍", "see mine", () => {
      loadBlockly(mineText);
      setName(mineName);
    });
    var theirsButton = mkButton("🔍", "see theirs", () => {
      loadBlockly(merge.theirs.scriptText);
      setName(merge.theirs.metadata.name);
    });
    var baseButton = mkButton("🔍", "see base", () => {
      loadBlockly(merge.base.scriptText);
      setName(merge.base.metadata.name);
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

  function setName(x: string) {
    $("#script-name").val(x);
  }

  function getName() {
    return $("#script-name").val();
  }

  var dirty = false;

  /* Some popup routines... */
  function clearPopups() {
    $(".popup").addClass("hidden");
  }
  function setupPopups() {
    /* Hide all popups when user clicks elsewhere. */
    $(document).click((e: Event) => {
      if ($(e.target).closest(".popup, .roundbutton").length)
        return;
      clearPopups();
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
    var popupw = popup[0].clientWidth;
    popup.css("left", Math.round(x - popupw + w/2 + 5 + 15)+"px");
    popup.css("top", Math.round(y + h + 10 + 5)+"px");
  }

  var debouncedSave = debounce(doSave, 5000, false);
 
  function markLocalChanges() {
    statusMsg("✎ local changes", External.Status.Ok);
    statusIcon("pencil");
    dirty = true;
    debouncedSave();
  }

  // Called once at startup
  function setupEditor(message: External.Message_Init) {
    var state = <MyEditorState> message.script.editorState;

    var blocklyArea = document.getElementById('editor');
    var blocklyDiv = document.getElementById('blocklyDiv');
    var workspace = Blockly.inject(blocklyDiv, {
      toolbox: document.getElementById("blockly-toolbox"),
      scrollbars: true,
      media: "./media/",
      zoom: {
        enabled: true,
        controls: true,
        wheel: true,
        maxScale: 2,
        minScale: .1,
        scaleSpeed: 1.1
      },
    });
    
    // support for opening help on the side pane
    (<any>Blockly).BlockSvg.prototype.showHelp_ = function() {
        var url = goog.isFunction(this.helpUrl) ? this.helpUrl() : this.helpUrl;
        var m = /^https:\/\/www.microbit.co.uk(.*)$/i.exec(url);
        if (url) {
            if (m && m[1])
                post(<External.Message_Help>{
                    type: External.MessageType.Help,
                    path: m[1]
                });
            else window.open(url);
        }
    };
    onResize = () => {
      // Compute the absolute coordinates and dimensions of blocklyArea.
      var element = blocklyArea;
      var x = 0;
      var y = 0;
      do {
        x += element.offsetLeft;
        y += element.offsetTop;
        element = <HTMLElement> element.offsetParent;
      } while (element);
      // Position blocklyDiv over blocklyArea.
      blocklyDiv.style.left = x + 'px';
      blocklyDiv.style.top = y + 'px';
      blocklyDiv.style.width = blocklyArea.offsetWidth + 'px';
      blocklyDiv.style.height = blocklyArea.offsetHeight + 'px';
    };
    window.addEventListener('resize', onresize, false);
    window.addEventListener('orientationchange', onresize, false);
    onResize();

    loadBlockly(message.script.scriptText);
    // Hack alert! Blockly's [fireUiEvent] function [setTimeout]'s (with a 0 delay) the actual
    // firing of the event, meaning that the call to [inject] above schedule a change event to
    // be fired immediately after the current function is done. To make sure our change handler
    // does not receive that initial event, we schedule it for slightly later.
    window.setTimeout(() => {
      Blockly.mainWorkspace.addChangeListener(() => {
        markLocalChanges();
      });
    }, 1);
    $("#script-name").on("blur", () => {
      if (getName().trim() == "")
        setName("staggering program");
      markLocalChanges();
    });
    $("#script-name").on("input keyup blur", () => {
      markLocalChanges();
    });

    setName(message.script.metadata.name);
    if (!message.script.baseSnapshot && !message.script.metadata.comment) {
      markLocalChanges();
    }

    // That's triggered when the user closes or reloads the whole page, but
    // doesn't help if the user hits the "back" button in our UI.
    window.addEventListener("beforeunload", e => {
      if (dirty) {
        var confirmationMessage = "Some of your changes have not been saved. Quit anyway?";
        (e || window.event).returnValue = confirmationMessage;
        return confirmationMessage;
      }
    });

    document.addEventListener("dragover", (event) => {
      // This is mandatory to allow dropping...
      event.preventDefault();
    });

    document.addEventListener("drop", (event) => {
      event.preventDefault();
      for (var i = 0; i < event.dataTransfer.files.length; ++i) {
        var f = event.dataTransfer.files[i];
        if (/\.(hex|json|jsz)$/.test(f.name))
          post(<External.Message_Load> {
            type: External.MessageType.Load,
            file: f
          });
      }
    });

    setupPopup($("#link-log"), $("#popup-log"));
    setupPopups();

    // Run the program when loaded if it compiles and if the simulator is
    // already visible.
    var ast = compileOrError(false);
    if (ast)
      post(<External.Message_Run> {
        type: External.MessageType.Run,
        ast: <any> ast,
        libs: libs,
        onlyIfSplit: true,
      });

    console.log("[loaded] cloud version " + message.script.baseSnapshot +
      "(dated from: "+state.lastSave+")");
  }

  interface MyEditorState extends External.EditorState {
      lastSave: Date
  }

  function doSave(force = false) {
    if (!dirty && !force) {
      console.log('nothing to save...')
      return;
    }

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
          comment: ''
        }
      },
    });
    dirty = false;
  }

  function compileOrError(appendSuffix: boolean, msgSel?: string) {
    var ast: TDev.AST.Json.JApp;

    $(".blocklySelected, .blocklyError").each((i, x) =>
        x.setAttribute("class", x.getAttribute("class").replace(/(blocklySelected|blocklyError)/g, "")));
    clearPopups();
    $("#errorsGraduate").addClass("hidden");
    $("#errorsCompile").addClass("hidden");
    $("#errorsRun").addClass("hidden");

    try {
      ast = compile(Blockly.mainWorkspace, {
        name: getName() + (appendSuffix ? " (converted)" : ""),
        description: ''
      });
    } catch (e) {
      statusMsg("⚠ compilation error: "+e, External.Status.Error);
      showPopup($("#link-log"), $("#popup-log"));
    }

    var errors = Errors.get();
    if (errors.length && msgSel) {
      var text = "";
      errors
      .slice(0, 1) // Just display the first error
      .forEach((e: Errors.CompilationError) => {
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

  var libs: { [index: string]: External.LibEntry } = {
    "micro:bit": {
      pubId: "lwhfye",
      depends: []
    },

    "micro:bit game": {
      pubId: "lwagkt",
      depends: [ "micro:bit" ]
    },

    "micro:bit sprites": {
      pubId: "vzkdcc",
      depends: [ "micro:bit", "micro:bit game" ]
    },
    
    "micro:bit screen": {
      pubId: "nzngii",
      depends: [ "micro:bit" ]
    },

    "micro:bit senses": {
      pubId: "vkmzfe",
      depends: [ "micro:bit" ]
    },
    
    "micro:bit music": {
      pubId: "zbiwoq",
      depends: [ "micro:bit" ]
    }, 
    
    "micro:bit radio": {
      pubId: "fgkphf",
      depends: [ "micro:bit" ]
    },
  };

  function doGraduate(msgSel?: string) {
    var ast = compileOrError(true, msgSel);
    if (!ast)
      return;
    doSave();
    post(<External.Message_Upgrade> {
      type: External.MessageType.Upgrade,
      ast: ast,
      name: getName()+" (converted)",
      libs: libs,
    });
  }

  function doCompile(msgSel?: string) {
    var ast = compileOrError(false, msgSel);
    if (!ast)
      return;
    $("#command-compile > .roundsymbol").addClass("compiling");
    doSave();
    post(<External.Message_Compile> {
      type: External.MessageType.Compile,
      text: ast,
      language: External.Language.TouchDevelop,
      name: getName(),
      libs: libs,
      source: saveBlockly()
    });
  }
  
  function doRun(auto : boolean) {
    var ast = compileOrError(false, "#errorsRun");
    if (!ast)
      return;
    post(<External.Message_Run>{
      type: External.MessageType.Run,
      ast: <any>ast,
      libs: libs,
      onlyIfSplit: auto
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
    $("#command-run").click(() => doRun(false));
  }       
}

// vim: set ts=2 sw=2 sts=2:
