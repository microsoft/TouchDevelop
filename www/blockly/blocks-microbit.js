'use strict';

goog.provide('Blockly.Blocks.microbug');

goog.require('Blockly.Blocks');

// Blockly.Blocks['microbug_scroll_string'] = {
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

// https://blockly-demo.appspot.com/static/demos/blockfactory/index.html#83qc3o
Blockly.Blocks['microbug_set_eye'] = {
  init: function() {
    this.setHelpUrl('http://www.example.com/');
    this.setColour(160);
    this.appendDummyInput()
        .appendField("set eye");
    this.appendValueInput("id")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT);
    this.appendValueInput("state")
        .setCheck(["OnOffState","Boolean"])
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("state");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('');
    this.setInputsInline(true);
    }
};

//https://blockly-demo.appspot.com/static/demos/blockfactory/index.html#jgkr8y
Blockly.Blocks['microbug_eye_on'] = {
  init: function() {
    this.setHelpUrl('http://www.example.com/');
    this.setColour(160);
    this.appendDummyInput()
        .appendField("eye on");
    this.appendValueInput("id")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT);
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('');
  }
};
Blockly.Blocks['microbug_eye_off'] = {
  init: function() {
    this.setHelpUrl('http://www.example.com/');
    this.setColour(160);
    this.appendDummyInput()
        .appendField("eye off");
    this.appendValueInput("id")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT);
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('');
  }
};

Blockly.Blocks['microbug_toggle_eye'] = {
  init: function() {
    this.setHelpUrl('http://www.example.com/');
    this.setColour(160);
    this.appendDummyInput()
        .appendField("toggle eye");
    this.appendValueInput("id")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT);
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('');
  }
};

//https://blockly-demo.appspot.com/static/demos/blockfactory/index.html#tmkc86
Blockly.Blocks['microbug_print_message'] = {
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
Blockly.Blocks['microbug_show_letter'] = {
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

//https://blockly-demo.appspot.com/static/demos/blockfactory/index.html#oxk4nt
Blockly.Blocks['microbug_get_button'] = {
  init: function() {
    this.setHelpUrl('http://www.example.com/');
    this.setColour(160);
    this.appendDummyInput()
        .appendField("get button");
    this.appendValueInput("id")
        .setCheck("String");
//        .appendField("id");
    this.setInputsInline(true);
    this.setOutput(true);
    this.setTooltip('');
  }
};

//https://blockly-demo.appspot.com/static/demos/blockfactory/index.html#nwf7c5
Blockly.Blocks['microbug_clear_display'] = {
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
Blockly.Blocks['microbug_plot'] = {
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
Blockly.Blocks['microbug_unplot'] = {
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
Blockly.Blocks['microbug_point'] = {
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

Blockly.Blocks['microbug_build_image'] = {
    init: function()
    {
        this.setColour(160);
        this.appendDummyInput().appendField("make image");
        this.appendDummyInput().appendField("4").appendField(new Blockly.FieldCheckbox("FALSE"), "LED04").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED14").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED24").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED34").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED44");
        this.appendDummyInput().appendField("3").appendField(new Blockly.FieldCheckbox("FALSE"), "LED03").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED13").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED23").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED33").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED43");
        this.appendDummyInput().appendField("2").appendField(new Blockly.FieldCheckbox("FALSE"), "LED02").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED12").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED22").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED32").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED42");
        this.appendDummyInput().appendField("1").appendField(new Blockly.FieldCheckbox("FALSE"), "LED01").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED11").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED21").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED31").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED41");
        this.appendDummyInput().appendField("0").appendField(new Blockly.FieldCheckbox("FALSE"), "LED00").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED10").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED20").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED30").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED40");
        this.appendDummyInput().appendField("    0     1     2     3     4");
        this.setOutput(true, 'sprite');
    }
};

Blockly.Blocks['microbug_build_big_image'] = {
    init: function()
    {
        this.setColour(160);
        this.appendDummyInput().appendField("make big image");

        this.appendDummyInput().appendField("4").appendField(new Blockly.FieldCheckbox("FALSE"), "LED04").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED14").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED24").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED34").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED44")
            .appendField(new Blockly.FieldCheckbox("FALSE"), "LED54").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED64").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED74").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED84").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED94");

        this.appendDummyInput().appendField("3").appendField(new Blockly.FieldCheckbox("FALSE"), "LED03").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED13").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED23").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED33").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED43")
            .appendField(new Blockly.FieldCheckbox("FALSE"), "LED53").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED63").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED73").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED83").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED93");

        this.appendDummyInput().appendField("2").appendField(new Blockly.FieldCheckbox("FALSE"), "LED02").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED12").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED22").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED32").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED42")
            .appendField(new Blockly.FieldCheckbox("FALSE"), "LED52").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED62").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED72").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED82").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED92");

        this.appendDummyInput().appendField("1").appendField(new Blockly.FieldCheckbox("FALSE"), "LED01").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED11").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED21").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED31").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED41")
            .appendField(new Blockly.FieldCheckbox("FALSE"), "LED51").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED61").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED71").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED81").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED91");

        this.appendDummyInput().appendField("0").appendField(new Blockly.FieldCheckbox("FALSE"), "LED00").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED10").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED20").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED30").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED40")
            .appendField(new Blockly.FieldCheckbox("FALSE"), "LED50").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED60").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED70").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED80").appendField(" ").appendField(new Blockly.FieldCheckbox("FALSE"), "LED90");

        this.appendDummyInput().appendField("    0     1     2     3     4     5     6     7     8     9");

        this.setOutput(true, 'sprite');
    }
};

// Blockly.Blocks['microbug_show_image'] = {
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

Blockly.Blocks['microbug_show_image_offset'] = {
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

Blockly.Blocks['microbug_scroll_image'] = {
  init: function() {
    this.setHelpUrl('http://www.example.com/');
    this.setColour(160);
    this.appendDummyInput()
        .appendField("scroll image");
    this.appendValueInput("sprite")
      .setCheck("sprite")
        .setAlign(Blockly.ALIGN_RIGHT);
//        .appendField("image");
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

Blockly.Blocks['microbug_get_image_point'] = {
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

Blockly.Blocks['microbug_set_image_point'] = {
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


Blockly.Blocks['microbug_make_StringImage'] = {
  init: function() {
    this.setHelpUrl('http://www.example.com/');
    this.setColour(160);
    this.appendDummyInput()
        .appendField("make string image");
    this.appendValueInput("NAME")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT);
    this.setOutput(true, "StringImage");
    this.setTooltip('');
    this.setInputsInline(true);
  }
};

Blockly.Blocks['microbug_scroll_string_image'] = {
  init: function() {
    this.setHelpUrl('http://www.example.com/');
    this.setColour(160);
    this.appendDummyInput()
        .appendField("scroll string image");
    this.appendValueInput("string")
        .setCheck("StringImage")
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

Blockly.Blocks['microbug_pause'] = {
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

Blockly.Blocks['microbug_forever'] = {
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

Blockly.Blocks['microbug_get_eye'] = {
  init: function() {
    this.setHelpUrl('http://www.example.com/');
    this.setColour(160);
    this.appendDummyInput()
        .appendField("get eye");
    this.appendValueInput("NAME")
        .setCheck("String");
    this.setInputsInline(true);
    this.setOutput(true, "OnOffState");
    this.setTooltip('');
  }
};

Blockly.Blocks['microbug_logic_onoff_states'] = {
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

Blockly.Blocks['microbug_logic_button_states'] = {
  init: function() {
    var BOOLEANS =
        [['pressed', 'PRESSED'],
         ['not_pressed','NOT_PRESSED']];
    this.setColour(210);
    this.setOutput(true, 'ButtonState');
    this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown(BOOLEANS), 'STATE');
  }
};

Blockly.Blocks['microbug_comment'] = {
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

Blockly.Blocks['math_number1'] = {
  init: function() {
    this.setHelpUrl(Blockly.Msg.MATH_NUMBER_HELPURL);
    this.setColour(230);
    this.appendDummyInput()
        .appendField(new Blockly.FieldTextInput('1',
        Blockly.FieldTextInput.numberValidator), 'NUM');
    this.setOutput(true, 'Number');
    this.setTooltip(Blockly.Msg.MATH_NUMBER_TOOLTIP);
  }
};
