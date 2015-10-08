'use strict';

goog.provide('Blockly.Blocks.device');

goog.require('Blockly.Blocks');

var buttonsDropdown =[
  ["A", "A"],
  ["B", "B"],
  ["A+B", "A+B"],
];

var analogPinsDropdown = [
  ["P0", "P0"],
  ["P1", "P1"],
  ["P2", "P2"]
];

var digitalPinsDropdown = [
  ["P0", "P0"],
  ["P1", "P1"],
  ["P2", "P2"],
];

// Blockly.Blocks['device_scroll_string'] = {
//   init: function() {
//     this.setHelpUrl('https://live.microbit.co.uk/blocks/contents');
//     this.setColour(0);
//     this.appendDummyInput()
//         .appendField("scroll_string");
//     this.appendValueInput("Message")
//         .setCheck("String")
//         .appendField("String");
//     this.appendValueInput("Speed")
//         .setCheck("Number")
//         .appendField("Speed");
//     this.setPreviousStatement(true);
//     this.setNextStatement(true);
//     this.setTooltip('');
//   }
// };


//https://blockly-demo.appspot.com/static/demos/blockfactory/index.html#tmkc86
Blockly.Blocks['device_print_message'] = {
  init: function() {
    this.setHelpUrl('https://live.microbit.co.uk/functions/show-string');
    this.setColour(160);
    this.appendDummyInput()
        .appendField("show");
    this.appendValueInput("message")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("string");
    this.appendValueInput("pausetime")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("with interval (ms)");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Shows the specified string and scrolls it if necessary.');
    this.setInputsInline(true);
 }
};

//https://blockly-demo.appspot.com/static/demos/blockfactory/index.html#xiu9u7
Blockly.Blocks['device_show_number'] = {
  init: function() {
    this.setHelpUrl('https://live.microbit.co.uk/functions/show-number');
    this.setColour(160);
    this.appendDummyInput()
        .appendField("show number");
    this.appendValueInput("number")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT);
    this.appendValueInput("pausetime")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("with interval (ms)");
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Shows the specified number and scrolls it if necessary.');
  }
};

Blockly.Blocks['device_shake_event'] = {
  init: function() {
    this.setHelpUrl('https://live.microbit.co.uk/functions/on-shake');
    this.setColour(120);
    this.appendDummyInput()
        .appendField("on shake");
    this.appendStatementInput("HANDLER")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("do");
    this.setInputsInline(true);
    this.setTooltip('React to the device being shaken.');
  }
};

Blockly.Blocks['device_pin_event'] = {
  init: function() {
    this.setHelpUrl('https://live.microbit.co.uk/functions/on-pin-pressed');
    this.setColour(120);
    this.appendDummyInput()
        .appendField("on pin");
    this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown(analogPinsDropdown), "NAME");
    this.appendDummyInput()
        .appendField("pressed");
    this.appendStatementInput("HANDLER")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("do");
    this.setInputsInline(true);
    this.setTooltip('React to a pin press.');
  }
};

Blockly.Blocks['device_button_event'] = {
  init: function() {
    this.setHelpUrl('https://live.microbit.co.uk/functions/on-button-pressed');
    this.setColour(120);
    this.appendDummyInput()
        .appendField("on button");
    this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown(buttonsDropdown), "NAME");
    this.appendDummyInput()
        .appendField("pressed");
    this.appendStatementInput("HANDLER")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("do");
    this.setInputsInline(true);
    this.setTooltip('React to a button press.');
  }
};

Blockly.Blocks['device_get_button'] = {
  init: function() {
    this.setHelpUrl('https://live.microbit.co.uk/functions/button-is-pressed');
    this.setColour(210);
    this.appendDummyInput()
        .appendField("button");
    this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown(buttonsDropdown), "NAME");
    this.appendDummyInput()
        .appendField("is pressed");
    this.setInputsInline(true);
    this.setOutput(true, "Boolean");
    this.setTooltip('Test whether a button is pressed or not.');
  }
};

Blockly.Blocks['device_get_digital_pin'] = {
    init: function () {
        this.setHelpUrl('https://live.microbit.co.uk/functions/digital-read-pin');
        this.setColour(230);
        this.appendDummyInput()
            .appendField("digital read pin (0,1)")
            .appendField(new Blockly.FieldDropdown(digitalPinsDropdown), "name");
        this.setInputsInline(true);
        this.setOutput(true, "Number");
        this.setTooltip('Read the value of a pin (either 0 or 1).');
    }
};

Blockly.Blocks['device_set_digital_pin'] = {
    init: function () {
        this.setHelpUrl('https://live.microbit.co.uk/functions/digital-write-pin');
        this.setColour(160);
        this.appendDummyInput()
            .appendField("digital write (0,1)");
        this.appendValueInput("value")
            .setCheck("Number");
        this.appendDummyInput()
            .appendField("to pin")
            .appendField(new Blockly.FieldDropdown(digitalPinsDropdown), "name");
        this.setInputsInline(true);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setTooltip('Set the value of a pin (either 0 or 1).');
    }
};

Blockly.Blocks['device_get_analog_pin'] = {
    init: function () {
        this.setHelpUrl('https://live.microbit.co.uk/functions/analog-read-pin');
        this.setColour(230);
        this.appendDummyInput()
            .appendField("analog read pin")
            .appendField(new Blockly.FieldDropdown(analogPinsDropdown), "name");
        this.setInputsInline(true);
        this.setOutput(true, "Number");
        this.setTooltip('Read an analog value on a pin (between 0 and 1024).');
    }
};

Blockly.Blocks['device_set_analog_pin'] = {
    init: function () {
        this.setHelpUrl('https://live.microbit.co.uk/functions/analog-write-pin');
        this.setColour(160);
        this.appendDummyInput()
            .appendField("analog write");
        this.appendValueInput("value")
            .setCheck("Number");
        this.appendDummyInput()
            .appendField("to pin")
            .appendField(new Blockly.FieldDropdown(analogPinsDropdown), "name");
        this.setInputsInline(true);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setTooltip('Set an analog value on a pin (between 0 and 1024).');
    }
};

Blockly.Blocks['device_get_brightness'] = {
    init: function () {
        this.setHelpUrl('https://live.microbit.co.uk/functions/brightness');
        this.setColour(230);
        this.appendDummyInput()
            .appendField("brightness");
        this.setOutput(true, "Number");
        this.setTooltip('Get the current brightness of the screen (between 0 and 255).');
    }
};

Blockly.Blocks['device_set_brightness'] = {
    init: function () {
        this.setHelpUrl('https://live.microbit.co.uk/functions/set-brightness');
        this.setColour(160);
        this.appendDummyInput()
            .appendField("set brightness");
        this.appendValueInput("value")
            .setCheck("Number");
        this.setInputsInline(true);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setTooltip('Set the current brightness of the screen (between 0 and 255).');
    }
};

Blockly.Blocks['device_get_acceleration'] = {
    init: function () {
        this.setHelpUrl('https://live.microbit.co.uk/functions/acceleration');
        this.setColour(230);
        this.appendDummyInput()
            .appendField("acceleration (mg)");
        this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown([
                ["x", "x"],
                ["y", "y"],
                ["z", "z"],
            ]), "NAME");
        this.setInputsInline(true);
        this.setOutput(true, "Number");
        this.setTooltip('Get the acceleration on an axis (between -2048 and 2047).');
    }
};

//https://blockly-demo.appspot.com/static/demos/blockfactory/index.html#nwf7c5
Blockly.Blocks['device_clear_display'] = {
  init: function() {
    this.setHelpUrl('https://live.microbit.co.uk/functions/clear-screen');
    this.setColour(160);
    this.appendDummyInput()
        .appendField("clear screen");
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Turns all LEDs off.');
  }
};

//https://blockly-demo.appspot.com/static/demos/blockfactory/index.html#rhpgfx
Blockly.Blocks['device_plot'] = {
  init: function() {
    this.setHelpUrl('https://live.microbit.co.uk/functions/plot');
    this.setColour(160);
    this.appendDummyInput()
        .appendField("plot");
    this.appendValueInput("x")
        .setCheck("Number")
        .appendField("x");
    this.appendValueInput("y")
        .setCheck("Number")
        .appendField("y");
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Turns the LED at coordinates (x, y) on.');
  }
};
Blockly.Blocks['device_unplot'] = {
  init: function() {
    this.setHelpUrl('https://live.microbit.co.uk/functions/unplot');
    this.setColour(160);
    this.appendDummyInput()
        .appendField("unplot");
    this.appendValueInput("x")
        .setCheck("Number")
        .appendField("x");
    this.appendValueInput("y")
        .setCheck("Number")
        .appendField("y");
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Turns the LED at coordinates (x, y) off.');
  }
};

//https://blockly-demo.appspot.com/static/demos/blockfactory/index.html#jw5b4i
Blockly.Blocks['device_point'] = {
  init: function() {
    this.setHelpUrl('https://live.microbit.co.uk/functions/point');
    this.setColour(210);
    this.appendDummyInput()
        .appendField("point");
    this.appendValueInput("x")
        .setCheck("Number")
        .appendField("x");
    this.appendValueInput("y")
        .setCheck("Number")
        .appendField("y");
    this.setInputsInline(true);
    this.setOutput(true, "Boolean");
    this.setTooltip('Returns 1 if the LED at coordinates (x, y) is on, 0 otherwise.');
  }
};

Blockly.Blocks['device_heading'] = {
    init: function () {
        this.setHelpUrl('https://live.microbit.co.uk/functions/compass-heading');
        this.setColour(230);
        this.appendDummyInput()
            .appendField("compass heading (°)");
        this.setInputsInline(true);
        this.setOutput(true, "Number");
        this.setTooltip('Returns an orientation (between 0 and 360°). 0 is North.');
    }
};

Blockly.Blocks['device_build_image'] = {
    init: function()
    {
        this.setColour(20);
        this.appendDummyInput().appendField("create image");
        this.appendDummyInput().appendField("    0     1     2     3     4");
        this.appendDummyInput().appendField("0").appendField(new Blockly.FieldCheckbox("FALSE"), "LED00").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED10").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED20").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED30").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED40");
        this.appendDummyInput().appendField("1").appendField(new Blockly.FieldCheckbox("FALSE"), "LED01").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED11").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED21").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED31").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED41");
        this.appendDummyInput().appendField("2").appendField(new Blockly.FieldCheckbox("FALSE"), "LED02").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED12").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED22").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED32").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED42");
        this.appendDummyInput().appendField("3").appendField(new Blockly.FieldCheckbox("FALSE"), "LED03").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED13").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED23").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED33").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED43");
        this.appendDummyInput().appendField("4").appendField(new Blockly.FieldCheckbox("FALSE"), "LED04").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED14").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED24").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED34").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED44");
        this.setOutput(true, 'sprite');
        this.setTooltip('An image that fits on the LED array.');
        this.setHelpUrl("https://live.microbit.co.uk/functions/create-image");
    }
};

Blockly.Blocks['device_build_big_image'] = {
    init: function()
    {
        this.setColour(20);
        this.appendDummyInput().appendField("create big image");
        this.appendDummyInput().appendField("    0     1     2     3     4     5     6     7     8     9");

        this.appendDummyInput().appendField("0").appendField(new Blockly.FieldCheckbox("FALSE"), "LED00").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED10").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED20").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED30").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED40")
            .appendField(new Blockly.FieldCheckbox("FALSE"), "LED50").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED60").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED70").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED80").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED90");

        this.appendDummyInput().appendField("1").appendField(new Blockly.FieldCheckbox("FALSE"), "LED01").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED11").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED21").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED31").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED41")
            .appendField(new Blockly.FieldCheckbox("FALSE"), "LED51").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED61").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED71").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED81").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED91");

        this.appendDummyInput().appendField("2").appendField(new Blockly.FieldCheckbox("FALSE"), "LED02").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED12").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED22").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED32").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED42")
            .appendField(new Blockly.FieldCheckbox("FALSE"), "LED52").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED62").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED72").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED82").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED92");

        this.appendDummyInput().appendField("3").appendField(new Blockly.FieldCheckbox("FALSE"), "LED03").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED13").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED23").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED33").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED43")
            .appendField(new Blockly.FieldCheckbox("FALSE"), "LED53").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED63").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED73").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED83").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED93");

        this.appendDummyInput().appendField("4").appendField(new Blockly.FieldCheckbox("FALSE"), "LED04").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED14").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED24").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED34").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED44")
            .appendField(new Blockly.FieldCheckbox("FALSE"), "LED54").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED64").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED74").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED84").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED94");


        this.setOutput(true, 'sprite');
        this.setTooltip("A larger image that will be scrolled across the LED display.");
        this.setHelpUrl("https://live.microbit.co.uk/functions/create-image");
    }
};

Blockly.Blocks['device_show_image_offset'] = {
  init: function() {
    this.setHelpUrl('https://live.microbit.co.uk/functions/show-image');
    this.setColour(160);
    this.appendDummyInput()
        .appendField("show image");
    this.appendValueInput("sprite").setCheck('sprite');
    this.appendValueInput("offset")
        .setCheck("Number")
        .appendField("at offset");
    this.setTooltip('For a given (possibly big) image, display only frame, starting at offset.');
    this.setPreviousStatement(!0);
    this.setNextStatement(!0);
    this.setInputsInline(true);
  }
};

Blockly.Blocks['device_scroll_image'] = {
  init: function() {
    this.setHelpUrl('https://live.microbit.co.uk/functions/scroll-image');
    this.setColour(160);
    this.appendDummyInput()
        .appendField("scroll image");
    this.appendValueInput("sprite")
      .setCheck("sprite")
        .setAlign(Blockly.ALIGN_RIGHT);
//        .appendField("image");
    this.appendValueInput("frame offset")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("with offset");
    this.appendValueInput("delay")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("and interval (ms)");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Display an image, scrolling it if it doesn\'t fit on the display.');
    this.setInputsInline(true);
  }
};


Blockly.Blocks['device_pause'] = {
  init: function() {
    this.setHelpUrl('https://live.microbit.co.uk/functions/pause');
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

Blockly.Blocks['device_forever'] = {
  init: function() {
    this.setHelpUrl('https://live.microbit.co.uk/functions/forever');
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

Blockly.Blocks['device_comment'] = {
  init: function() {
    this.setHelpUrl('https://live.microbit.co.uk/blocks/contents');
    this.setColour(120);
    this.appendDummyInput()
        .appendField("comment");
    this.appendValueInput("comment")
        .setCheck("String");
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Comment a piece of code. Comment is preserved when converting.');
  }
};

Blockly.Blocks['math_op2'] = {
  init: function() {
    this.setHelpUrl('https://live.microbit.co.uk/blocks/contents');
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
    this.setHelpUrl('https://live.microbit.co.uk/blocks/contents');
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

Blockly.Blocks['device_while'] = {
  init: function() {
    this.setHelpUrl('https://live.microbit.co.uk/td/while');
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

Blockly.Blocks['device_random'] = {
  init: function() {
    this.setHelpUrl('https://live.microbit.co.uk/blocks/contents');
    this.setColour(230);
    this.appendDummyInput()
        .appendField("random number up to")
        .appendField(new Blockly.FieldTextInput("0", Blockly.FieldTextInput.numberValidator), "limit");
    this.setInputsInline(true);
    this.setOutput(true, "Number");
    this.setTooltip('Gives a random number.');
  }
};

Blockly.Blocks['controls_simple_for'] = {
  /**
   * Block for 'for' loop.
   * @this Blockly.Block
   */
  init: function() {
    this.setHelpUrl("https://live.microbit.co.uk/td/for");
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
