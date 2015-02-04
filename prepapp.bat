setlocal

attrib -R cordovaeditor\www\index.html
attrib -R cordovaeditor\www\browser.js
attrib -R cordovaeditor\www\main.js
attrib -R cordovaeditor\www\css\default.css
attrib -R cordovaeditor\www\css\editor.css
copy /Y css\default.css cordovaeditor\www\css\default.css
copy /Y css\editor.css cordovaeditor\www\css\editor.css
copy /Y browser.js cordovaeditor\www\browser.js
copy /Y main.js cordovaeditor\www\main.js
copy /Y index.html cordovaeditor\www\index.html
