all:
	cd .. && jake
	rm -f out.ts
	node ../build/noderunner.js ts tdlite.td
	cat prelude.ts out.ts > tdlite.ts
	rm -f out.ts
	node node_modules/typescript/bin/tsc
	#node built/test.js
