This directory contains an "an external editor" sample that packages Google's
blockly.

The following files have been pulled from the archive found under the "Get the
Code" section at https://developers.google.com/blockly/installation/overview:

* `blockly_compressed.js`
* `blockly-main.ts`
* `blocks_compressed.js`

To refresh these files, just fetch a newer archive and copy the new versions
here.

Note: code.org's builds of blockly seem to be buggy at the moment, so in order
to use their fork of blockly, we would need to setup a build system to rebuild
the minified/compressed.js from their repo.
