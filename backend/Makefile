N=parallel

all:
	cd .. && jake
	rm -f out.ts
	node ../build/noderunner.js ts td/$(N).td
	cat prelude.ts out.ts > src/$(N).ts
	rm -f out.ts
	node node_modules/typescript/bin/tsc
	#node built/test.js
