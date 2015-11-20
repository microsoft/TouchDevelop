'use strict';

goog.provide('Blockly.Blocks.device');

goog.require('Blockly.Blocks');
//https://blockly-demo.appspot.com/static/demos/blockfactory/index.html#tmkc86

Blockly.Blocks['basic_pause'] = {
  init: function() {
    //this.setHelpUrl('https://live.microbit.co.uk/functions/pause');
    this.setColour(160);
    this.appendDummyInput()
        .appendField("pause (ms)");
    this.appendValueInput("pause")
        .setCheck("Number");
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Stop execution for the given delay, hence allowing other threads of execution to run.');
  }
};

Blockly.Blocks['basic_forever'] = {
  init: function() {
    //this.setHelpUrl('https://live.microbit.co.uk/functions/forever');
    this.setColour(120);
    this.appendDummyInput()
        .appendField("forever");
    this.appendStatementInput("HANDLER")
        .setCheck("null");
    this.setInputsInline(true);
    //this.setPreviousStatement(true, "null");
    this.setTooltip('Run a sequence of operations repeatedly, in the background.');
  }
};

Blockly.Blocks['comment'] = {
  init: function() {
    //this.setHelpUrl('https://live.microbit.co.uk/td/comment');
    this.setColour(180);
    this.appendDummyInput()
        .appendField("note:")
        .appendField(new Blockly.FieldTextInput("this code does ..."), "comment");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Comment a piece of code. Comment is preserved when converting.');
  }
};

Blockly.Blocks['math_op2'] = {
  init: function() {
    //this.setHelpUrl('https://live.microbit.co.uk/blocks/contents');
    this.setColour(230);
    this.appendValueInput("x")
        .setCheck("Number")
        .appendField(new Blockly.FieldDropdown([["min", "min"], ["max", "max"]]), "op")
        .appendField("of");
    this.appendValueInput("y")
        .setCheck("Number")
        .appendField("and");
    this.setInputsInline(true);
    this.setOutput(true, "Number");
    this.setTooltip('Math operators.');
  }
};

Blockly.Blocks['math_op3'] = {
  init: function() {
    //this.setHelpUrl('https://live.microbit.co.uk/blocks/contents');
    this.setColour(230);
    this.appendDummyInput()
        .appendField("absolute of");
    this.appendValueInput("x")
        .setCheck("Number")
    this.setInputsInline(true);
    this.setOutput(true, "Number");
    this.setTooltip('Math operators.');
  }
};

Blockly.Blocks['controls_while'] = {
  init: function() {
    //this.setHelpUrl('https://live.microbit.co.uk/td/while');
    this.setColour(120);
    this.appendValueInput("COND")
        .setCheck("Boolean")
        .appendField("while");
    this.appendStatementInput("DO")
        .appendField("do");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Run the same sequence of actions while the condition is met. Don\'t forget to pause!');
  }
};

Blockly.Blocks['math_random'] = {
  init: function() {
    //this.setHelpUrl('https://live.microbit.co.uk/blocks/contents');
    this.setColour(230);
    this.appendDummyInput()
        .appendField("pick random 0 to")
        .appendField(new Blockly.FieldTextInput("0", Blockly.FieldTextInput.numberValidator), "limit");
    this.setInputsInline(true);
    this.setOutput(true, "Number");
    this.setTooltip('Returns a random integer between 0 and the specified bound (inclusive).');
  }
};

Blockly.Blocks['controls_simple_for'] = {
  /**
   * Block for 'for' loop.
   * @this Blockly.Block
   */
  init: function() {
    //this.setHelpUrl("https://live.microbit.co.uk/td/for");
    this.setColour(Blockly.Blocks.loops.HUE);
    this.appendDummyInput()
        .appendField("for")
        .appendField(new Blockly.FieldVariable(null), 'VAR')
        .appendField("from 0 to");
    this.appendValueInput("TO")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT);
    this.appendStatementInput('DO')
        .appendField(Blockly.Msg.CONTROLS_FOR_INPUT_DO);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setInputsInline(true);
    // Assign 'this' to a variable for use in the tooltip closure below.
    var thisBlock = this;
    this.setTooltip(function() {
      return Blockly.Msg.CONTROLS_FOR_TOOLTIP.replace('%1',
          thisBlock.getFieldValue('VAR'));
    });
  },
  /**
   * Return all variables referenced by this block.
   * @return {!Array.<string>} List of variable names.
   * @this Blockly.Block
   */
  getVars: function() {
    return [this.getFieldValue('VAR')];
  },
  /**
   * Notification that a variable is renaming.
   * If the name matches one of this block's variables, rename it.
   * @param {string} oldName Previous name of variable.
   * @param {string} newName Renamed variable.
   * @this Blockly.Block
   */
  renameVar: function(oldName, newName) {
    if (Blockly.Names.equals(oldName, this.getFieldValue('VAR'))) {
      this.setFieldValue(newName, 'VAR');
    }
  },
  /**
   * Add menu option to create getter block for loop variable.
   * @param {!Array} options List of menu options to add to.
   * @this Blockly.Block
   */
  customContextMenu: function(options) {
    if (!this.isCollapsed()) {
      var option = {enabled: true};
      var name = this.getFieldValue('VAR');
      option.text = Blockly.Msg.VARIABLES_SET_CREATE_GET.replace('%1', name);
      var xmlField = goog.dom.createDom('field', null, name);
      xmlField.setAttribute('name', 'VAR');
      var xmlBlock = goog.dom.createDom('block', null, xmlField);
      xmlBlock.setAttribute('type', 'variables_get');
      option.callback = Blockly.ContextMenu.callbackFactory(this, xmlBlock);
      options.push(option);
    }
  }
};

Blockly.pathToMedia = "./media/";
Blockly.BlockSvg.START_HAT = true;

// Here's a helper to override the help URL for a block that's *already defined
// by Blockly*. For blocks that we define ourselves, just change the call to
// setHelpUrl in the corresponding definition above.
function monkeyPatchBlock(name, url) {
    var old = Blockly.Blocks[name].init;
    Blockly.Blocks[name].init = function () {
        // The magic of dynamic this-binding.
        old.call(this);
        this.setHelpUrl(url);
    };
}

monkeyPatchBlock("controls_if", "https://live.microbit.co.uk/td/if");
// monkeyPatchBlock("controls_repeat_ext", "https://live.microbit.co.uk/blocks/contents");
// monkeyPatchBlock("variables_set", "https://live.microbit.co.uk/blocks/contents");
// monkeyPatchBlock("variables_get", "https://live.microbit.co.uk/blocks/contents");
// monkeyPatchBlock("math_number", "https://live.microbit.co.uk/blocks/contents");
// monkeyPatchBlock("logic_compare", "https://live.microbit.co.uk/blocks/contents");
// monkeyPatchBlock("logic_operation", "https://live.microbit.co.uk/blocks/contents");
// monkeyPatchBlock("logic_negate", "https://live.microbit.co.uk/blocks/contents");
// monkeyPatchBlock("logic_boolean", "https://live.microbit.co.uk/blocks/contents");
// monkeyPatchBlock("logic_arithmetic", "https://live.microbit.co.uk/blocks/contents");
