@echo off
setlocal
attrib -R browser.js
attrib -R main.js
cd build
"c:\Program Files\nodejs\node.exe" boot.js %*
