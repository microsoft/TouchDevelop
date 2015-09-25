N=microsoft-translator

all:
	node node_modules/typescript/bin/tsc

conv:
	cd .. && jake
	rm -f out.ts
	node ../build/noderunner.js ts td/$(N).td
	cat prelude.ts out.ts > src/$(N).ts
	rm -f out.ts
	$(MAKE) all

