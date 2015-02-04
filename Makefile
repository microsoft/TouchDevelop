TARGET = out
RELEASE = michal

all:
	(cd build; node boot.js)

clean:
	(cd build; node boot.js clean)

.PHONY: tags
tags:
	strada-tags.pl */*.ts

deploy: main.js 
	for f in css tutorial json; do \
	  mkdir -p $(TARGET)/$$f; \
	  cp -f $$f/* $(TARGET)/$$f/; \
	done
	cp main.js index.html $(TARGET)/


.PHONY: pub

pub: all do-pub

p: all do-pub-small

do-pub: 
	cmd /c "minify.bat runtime.js"
	cmd /c "minify.bat main.js"
	/c/dev/TouchStudio/Tools/DevUploader/bin/Debug/DevUploader.exe \
		-b:$(RELEASE) \
		touchdevelop.tgz \
		browser.js main.js tutorial icons css json index.html browsers.html app.manifest \
		runtime.js noderunner.js webapp.html cordova.js \
		error.html

do-pub-small: 
	/c/dev/TouchStudio/Tools/DevUploader/bin/Debug/DevUploader.exe \
		-b:$(RELEASE) \
		browser.js main.js css index.html browsers.html app.manifest cordova.js \
		webapp.html error.html

r: all
	node noderunner 80 silent

rd: all
	node --max-stack-size=30 --debug noderunner 80

t: all
	node nodeclient buildtest
	
WEBAPP = wawqgkhb

w:
	mkdir -p webapp/css
	cp TouchApp/TouchApp/js/*.js webapp/
	cp runtime.js webapp/
	cp webapp.html webapp/index.html
	cp error.html browsers.html browser.js webapp/
	cp css/default.css webapp/css/
	node nodeclient compile $(WEBAPP)
	mv compiled.js webapp/precompiled.js

wp8: all
	cmd /c copywp8.cmd

TRG=deploy
node-deploy:
	mkdir -p $(TRG)/json
	cp azure/* $(TRG)/
	cp json/apiData.js $(TRG)/json/
	cp noderunner.js $(TRG)/server.js
	date > $(TRG)/deploydate.txt
	cd $(TRG) && git add .
	cd $(TRG) && git commit -m "make deploy $(TRG)"
	cd $(TRG) && git push azure master
	@(echo; echo "***"; cat $(TRG)/deploydate.txt; echo "***")
