'use strict';

goog.provide('Blockly.Blocks.device');

goog.require('Blockly.Blocks');

var buttonsDropdown =[
  ["A", "A"],
  ["B", "B"],
];

var analogPinsDropdown = [
  ["C0", "C0"],
  ["C1", "C1"],
  ["C2", "C2"]
];

var digitalPinsDropdown = [
  ["C0", "C0"],
  ["C1", "C1"],
  ["C2", "C2"],
  ["P0", "P0"],
  ["P1", "P1"],
  ["P2", "P2"],
  ["P3", "P3"],
  ["P4", "P4"],
  ["P5", "P5"],
  ["P6", "P6"],
  ["P7", "P7"],
  ["P8", "P8"],
  ["P9", "P9"],
  ["P10", "P10"],
  ["P11", "P11"],
  ["P12", "P12"],
  ["P13", "P13"],
  ["P14", "P14"],
  ["P15", "P15"],
  ["P16", "P16"],
  ["P17", "P17"],
  ["P18", "P18"],
  ["P19", "P19"],
  ["P20", "P20"],
  ["P21", "P21"],
];

// Blockly.Blocks['device_scroll_string'] = {
//   init: function() {
//     this.setHelpUrl('http://www.example.com/');
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
    this.setHelpUrl('http://www.example.com/');
    this.setColour(160);
    this.appendDummyInput()
        .appendField("print");
    this.appendValueInput("message")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("string");
    this.appendValueInput("pausetime")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("pause (ms)");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('');
    this.setInputsInline(true);
 }
};

//https://blockly-demo.appspot.com/static/demos/blockfactory/index.html#xiu9u7
Blockly.Blocks['device_show_letter'] = {
  init: function() {
    this.setHelpUrl('http://www.example.com/');
    this.setColour(160);
    this.appendDummyInput()
        .appendField("show letter");
    this.appendValueInput("letter")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT);
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('');
  }
};

Blockly.Blocks['device_button_event'] = {
  init: function() {
    this.setHelpUrl('http://www.example.com/');
    this.setColour(120);
    this.appendDummyInput()
        .appendField("when");
    this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown(buttonsDropdown), "NAME");
    this.appendDummyInput()
        .appendField("button is pressed");
    this.appendStatementInput("HANDLER")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("do");
    this.setInputsInline(true);
    this.setTooltip('');
  }
};

Blockly.Blocks['device_get_button'] = {
  init: function() {
    this.setHelpUrl('http://www.example.com/');
    this.setColour(160);
    this.appendDummyInput()
        .appendField("button");
    this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown(buttonsDropdown), "NAME");
    this.appendDummyInput()
        .appendField("is pressed");
    this.setInputsInline(true);
    this.setOutput(true);
    this.setTooltip('');
  }
};

/* still needed?
Blockly.Blocks['device_button_type'] = {
  init: function() {
    this.setHelpUrl('http://www.example.com/');
    this.setColour(210);
    this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([["left", "left"], ["right", "right"]]), "name");
    this.setOutput(true, "button_type");
    this.setTooltip('');
  }
};

Blockly.Blocks['device_pin_type'] = {
    init: function () {
        this.setHelpUrl('http://www.example.com/');
        this.setColour(210);
        this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown(pinsDropdown), "name");
        this.setOutput(true, "pin_type");
        this.setTooltip('');
    }
};
*/

Blockly.Blocks['device_get_digital_pin'] = {
    init: function () {
        this.setHelpUrl('http://www.example.com/');
        this.setColour(160);
        this.appendDummyInput()
            .appendField("digital read pin")
            .appendField(new Blockly.FieldDropdown(digitalPinsDropdown), "name");
        this.setInputsInline(true);
        this.setOutput(true, "Number");
        this.setTooltip('');
    }
};

Blockly.Blocks['device_set_digital_pin'] = {
    init: function () {
        this.setHelpUrl('http://www.example.com/');
        this.setColour(160);
        this.appendDummyInput()
            .appendField("digital write");
        this.appendValueInput("value")
            .setCheck("Number");
        this.appendDummyInput()
            .appendField("to pin")
            .appendField(new Blockly.FieldDropdown(digitalPinsDropdown), "name");
        this.setInputsInline(true);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setTooltip('');
    }
};

Blockly.Blocks['device_get_analog_pin'] = {
    init: function () {
        this.setHelpUrl('http://www.example.com/');
        this.setColour(160);
        this.appendDummyInput()
            .appendField("analog read pin")
            .appendField(new Blockly.FieldDropdown(analogPinsDropdown), "name");
        this.setInputsInline(true);
        this.setOutput(true, "Number");
        this.setTooltip('');
    }
};

Blockly.Blocks['device_set_analog_pin'] = {
    init: function () {
        this.setHelpUrl('http://www.example.com/');
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
        this.setTooltip('');
    }
};

Blockly.Blocks['device_get_brightness'] = {
    init: function () {
        this.setHelpUrl('http://www.example.com/');
        this.setColour(160);
        this.appendDummyInput()
            .appendField("brightness");
        this.setOutput(true, "Number");
        this.setTooltip('');
    }
};

Blockly.Blocks['device_set_brightness'] = {
    init: function () {
        this.setHelpUrl('http://www.example.com/');
        this.setColour(160);
        this.appendDummyInput()
            .appendField("set brightness (%)");
        this.appendValueInput("value")
            .setCheck("Number");
        this.setInputsInline(true);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setTooltip('');
    }
};

Blockly.Blocks['device_get_acceleration'] = {
    init: function () {
        this.setHelpUrl('http://www.example.com/');
        this.setColour(160);
        this.appendDummyInput()
            .appendField("acceleration");
        this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown([
                ["x", "x"],
                ["y", "y"],
                ["z", "z"],
            ]), "NAME");
        this.setInputsInline(true);
        this.setOutput(true, "Number");
        this.setTooltip('');
    }
};

Blockly.Blocks['device_acceleration_type'] = {
    init: function () {
        this.setHelpUrl('http://www.example.com/');
        this.setColour(210);
        this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown([["x", "x"], ["y", "y"], ["z", "z"]]), "name");
        this.setOutput(true, "acceleration_type");
        this.setTooltip('');
    }
};

//https://blockly-demo.appspot.com/static/demos/blockfactory/index.html#nwf7c5
Blockly.Blocks['device_clear_display'] = {
  init: function() {
    this.setHelpUrl('http://www.example.com/');
    this.setColour(160);
    this.appendDummyInput()
        .appendField("clear display");
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('');
  }
};

//https://blockly-demo.appspot.com/static/demos/blockfactory/index.html#rhpgfx
Blockly.Blocks['device_plot'] = {
  init: function() {
    this.setHelpUrl('http://www.example.com/');
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
    this.setTooltip('');
  }
};
Blockly.Blocks['device_unplot'] = {
  init: function() {
    this.setHelpUrl('http://www.example.com/');
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
    this.setTooltip('');
  }
};

//https://blockly-demo.appspot.com/static/demos/blockfactory/index.html#jw5b4i
Blockly.Blocks['device_point'] = {
  init: function() {
    this.setHelpUrl('http://www.example.com/');
    this.setColour(160);
    this.appendDummyInput()
        .appendField("point");
    this.appendValueInput("x")
        .setCheck("Number")
        .appendField("x");
    this.appendValueInput("y")
        .setCheck("Number")
        .appendField("y");
    this.setInputsInline(true);
    this.setOutput(true, "OnOffState");
    this.setTooltip('');
  }
};

Blockly.Blocks['device_heading'] = {
    init: function () {
        this.setHelpUrl('http://www.example.com/');
        this.setColour(160);
        this.appendDummyInput()
            .appendField("heading");
        this.setInputsInline(true);
        this.setOutput(true, "Number");
        this.setTooltip('');
    }
};

Blockly.Blocks['device_build_image'] = {
    init: function()
    {
        this.setColour(160);
        this.appendDummyInput().appendField("make image");
        this.appendDummyInput().appendField("    0     1     2     3     4");
        this.appendDummyInput().appendField("0").appendField(new Blockly.FieldCheckbox("FALSE"), "LED00").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED10").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED20").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED30").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED40");
        this.appendDummyInput().appendField("1").appendField(new Blockly.FieldCheckbox("FALSE"), "LED01").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED11").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED21").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED31").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED41");
        this.appendDummyInput().appendField("2").appendField(new Blockly.FieldCheckbox("FALSE"), "LED02").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED12").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED22").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED32").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED42");
        this.appendDummyInput().appendField("3").appendField(new Blockly.FieldCheckbox("FALSE"), "LED03").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED13").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED23").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED33").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED43");
        this.appendDummyInput().appendField("4").appendField(new Blockly.FieldCheckbox("FALSE"), "LED04").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED14").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED24").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED34").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED44");
        this.setOutput(true, 'sprite');
    }
};

Blockly.Blocks['device_build_big_image'] = {
    init: function()
    {
        this.setColour(160);
        this.appendDummyInput().appendField("make big image");
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
    }
};

// Blockly.Blocks['device_show_image'] = {
//     init: function()
//     {
//         this.setColour(160);
//         this.appendDummyInput().appendField("show image");
//         this.appendValueInput("SPRITE").appendField("image");
//         this.setInputsInline(!0);
//         this.setPreviousStatement(!0);
//         this.setNextStatement(!0);
//     }
// };

Blockly.Blocks['device_show_image_offset'] = {
  init: function() {
    this.setHelpUrl('http://www.example.com/');
    this.setColour(160);
    this.appendDummyInput()
        .appendField("show image");
    this.appendValueInput("sprite").setCheck('sprite');
//        .appendField("image");
    this.appendValueInput("x")
        .setCheck("Number")
        .appendField("x");
    this.appendValueInput("y")
        .setCheck("Number")
        .appendField("y");
    this.setTooltip('');
    this.setPreviousStatement(!0);
    this.setNextStatement(!0);
    this.setInputsInline(true);
  }
};

Blockly.Blocks['device_scroll_image'] = {
  init: function() {
    this.setHelpUrl('http://www.example.com/');
    this.setColour(160);
    this.appendDummyInput()
        .appendField("scroll image");
    this.appendValueInput("sprite")
      .setCheck("sprite")
        .setAlign(Blockly.ALIGN_RIGHT);
//        .appendField("image");
    this.appendValueInput("x")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("x");
    this.appendValueInput("delay")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("delay (ms)");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('');
    this.setInputsInline(true);
  }
};

Blockly.Blocks['device_get_image_point'] = {
  init: function() {
    this.setHelpUrl('http://www.example.com/');
    this.setColour(160);
    this.appendDummyInput()
        .appendField("get_image_point");
    this.appendValueInput("id")
        .setCheck("sprite")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("image");
    this.appendValueInput("x")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("x");
    this.appendValueInput("y")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("y");
    this.setOutput(true, "OnOffState");
    this.setTooltip('');
  }
};

Blockly.Blocks['device_set_image_point'] = {
  init: function() {
    this.setHelpUrl('http://www.example.com/');
    this.setColour(160);
    this.appendDummyInput()
        .appendField("set_image_point");
    this.appendValueInput("id")
        .setCheck("sprite")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("image");
    this.appendValueInput("x")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("x");
    this.appendValueInput("y")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("y");
    this.appendValueInput("value")
        .setCheck("OnOffState")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("On/Off");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('');
  }
};


Blockly.Blocks['device_make_StringImage'] = {
  init: function() {
    this.setHelpUrl('http://www.example.com/');
    this.setColour(160);
    this.appendDummyInput()
        .appendField("make string image");
    this.appendValueInput("NAME")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT);
    this.setOutput(true, "sprite");
    this.setTooltip('');
    this.setInputsInline(true);
  }
};

Blockly.Blocks['device_scroll_string_image'] = {
  init: function() {
    this.setHelpUrl('http://www.example.com/');
    this.setColour(160);
    this.appendDummyInput()
        .appendField("scroll string image");
    this.appendValueInput("string")
        .setCheck("sprite")
        .setAlign(Blockly.ALIGN_RIGHT);
//        .appendField("String");
    this.appendValueInput("speed")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("delay (ms)");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('');
    this.setInputsInline(true);
  }
};

Blockly.Blocks['device_pause'] = {
  init: function() {
    this.setHelpUrl('http://www.example.com/');
    this.setColour(160);
    this.appendDummyInput()
        .appendField("pause (ms)");
    this.appendValueInput("pause");
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('');
  }
};

Blockly.Blocks['device_forever'] = {
  init: function() {
    this.setHelpUrl('http://www.example.com/');
    this.setColour(120);
    this.appendDummyInput()
        .appendField("forever");
    this.appendStatementInput("NAME")
        .setCheck("null");
    this.setInputsInline(true);
    this.setPreviousStatement(true, "null");
    this.setTooltip('');
  }
};

Blockly.Blocks['device_logic_onoff_states'] = {
  init: function() {
    var BOOLEANS =
        [['on', 'ON'],
         ['off', 'OFF']];
    this.setColour(210);
    this.setOutput(true, 'OnOffState');
    this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown(BOOLEANS), 'STATE');
  }
};

Blockly.Blocks['device_comment'] = {
  init: function() {
    this.setHelpUrl('http://www.example.com/');
    this.setColour(120);
    this.appendDummyInput()
        .appendField("comment");
    this.appendValueInput("comment")
        .setCheck("String");
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('');
  }
};

Blockly.Blocks['math_op2'] = {
  init: function() {
    this.setHelpUrl('http://www.example.com/');
    this.setColour(230);
    this.appendValueInput("x")
        .setCheck("Number")
        .appendField(new Blockly.FieldDropdown([["min", "min"], ["max", "max"]]), "op")
        .appendField("of");
    this.appendValueInput("y")
        .setCheck("Number")
        .appendField("and");
    this.setInputsInline(true);
    this.setOutput(true);
    this.setTooltip('');
  }
};

Blockly.Blocks['math_op3'] = {
  init: function() {
    this.setHelpUrl('http://www.example.com/');
    this.setColour(230);
    this.appendDummyInput()
        .appendField("absolute of");
    this.appendValueInput("x")
        .setCheck("Number")
    this.setInputsInline(true);
    this.setOutput(true);
    this.setTooltip('');
  }
};

Blockly.Blocks['device_while'] = {
  init: function() {
    this.setHelpUrl('http://www.example.com/');
    this.setColour(120);
    this.appendValueInput("COND")
        .setCheck("Boolean")
        .appendField("while");
    this.appendStatementInput("DO")
        .appendField("do");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('');
  }
};

// Overriding the default value.
Blockly.Msg.CONTROLS_FOR_INPUT_WITH = "for";
Blockly.pathToMedia = "./";
