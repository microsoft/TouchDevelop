all:
	cd .. && jake
	node ../build/noderunner.js ts tdlite.td
	cat prelude.ts out.ts > tdlite.ts
	node node_modules/typescript/bin/tsc
	#node built/test.js
