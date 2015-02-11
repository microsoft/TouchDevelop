all:
	jake

clean:
	jake clean

.PHONY: tags
tags:
	strada-tags.pl */*.ts

