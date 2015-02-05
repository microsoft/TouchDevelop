#!/bin/sh

rm -f tdserver.js
node ../../build/shell.js --cli TD_LOCAL_EDITOR_PATH=../.. TD_ALLOW_EDITOR=true
