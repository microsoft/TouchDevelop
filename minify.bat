..\External\AjaxMinifier.exe -line:,multiple,2 -inline:false -fnames:lock -kill:0x1000016000 -debug:false,TDev.Debug %* -out tmp.js
del %1
copy tmp.js %1
del tmp.js
