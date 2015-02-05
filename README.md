![](https://az31353.vo.msecnd.net/c04/uxoj.png)
# TouchDevelop

TouchDevelop is a touch-friendly app creation environment for iPad, iPhone,
Android, Windows, Mac, Linux developed with <3 at Microsoft Research. Our
mobile-friendly editor makes coding fun, even on your phone or tablet!

[![Build Status](https://magnum.travis-ci.com/Microsoft/TouchDevelop.svg?token=xmP93nU7s938rQtURxVz&branch=master)](https://magnum.travis-ci.com/Microsoft/TouchDevelop)

**This repo contains the source code of the TouchDevelop editor.** If you are
intending to write TouchDevelop scripts, you probably want to go to
`touchdevelop.com`:
* **stable:** https://www.touchdevelop.com/app
* **beta:** https://www.touchdevelop.com/app/beta

Other pages of interest:
* landing page: [https://www.touchdevelop.com](https://www.touchdevelop.com)
* blog: [https://www.touchdevelop.com/blog](https://www.touchdevelop.com/blog)
* Hour Of Code tutorials: [https://www.touchdevelop.com/hoc](https://www.touchdevelop.com/hoc)

## What's in this repo?

The repo is mostly written in [Typescript](http://www.typescriptlang.org/) with tiny pieces
of HTML gluing.

This repo contains the source code for:
* the browser client
 * the compiler
 * the editor
 * the runtime
* the node.js client

However, you will not find the cloud backend code here. Indeed,
[https://www.touchdevelop.com](https://www.touchdevelop.com) takes care of
storing and managing the scripts.

## Contributing

There are many ways to [contribute](https://github.com/Microsoft/TouchDevelop/blob/master/CONTRIBUTING.md) to TouchDevelop.

* [submit bugs](https://github.com/Microsoft/TouchDevelop/issues) and help us verify fixes as they are checked in.
* review the [source code changes](https://github.com/Microsoft/TouchDevelop/pulls)
* [contribute bug fixes or features](https://github.com/Microsoft/TouchDevelop/blob/master/CONTRIBUTING.md).

If you're not a developer but still would like to help, we've got more tasks for you!

* [help translate the user inferface](https://touchdeveloptranslator.azurewebsites.net): do you use TouchDevelop and speak a foreign language? You can help!

## Building

In order to build TouchDevelop, ensure that you have [Git](http://git-scm.com/downloads) and [Node.js](http://nodejs.org/) installed.

Clone a copy of the repo:

    git clone https://github.com/Microsoft/TouchDevelop.git

Change to the TouchDevelop directory:

    cd TouchDevelop

Install dependencies:

    npm install jake -g
    npm install

Build:

    jake

## Running

After building, you can run TouchDevelop from a local node server by running:

    jake run
    # or, if port 80 is already used on your machine
    jake run[8080]

## Tests

    jake test

## Cleaning

    jake clean

## Documentation

All the docs are available online at
[https://www.touchdevelop.com/docs](https://www.touchdevelop.com/docs).

The docs are authored as TouchDevelop scripts in TouchDevelop itself. You can
fork them and send pull requests from TouchDevelop itself to update them.

## More handy commands

Our catch-all tool is `build/client.js`, which is compiled from
`tools/client.ts`. Some of the common invocations of `client.js` are
exposed as Jake targets.

    # assumes TD_UPLOAD_KEY and TD_UPLOAD_USER are set, uploads a new test build
    jake upload
    # update the files in generated/
    jake update-docs

Find out about other commands directly:

    node build/client.js

The `client.js` is built by default.

## The various repositories in the tree

* `ast`: contains the lexer, parser, type-checker and ast definitions for the
  TouchDevelop language
* `browser`: feature-detection
* `editor`: the TouchDevelop user interface that drives the website: hub, script
  list, editor itself
* `generated`: files needed for the build that are re-generated manually once in
  a while
* `intellitrain`:
* `json`:
* `lib`: the libraries exposed to TouchDevelop scripts, written in TypeScript
* `libcordova`:
* `libnode`:
* `libwab`:
* `libwinRT`:
* `mc`: Minecraft bindings
* `noderunner`: runs in the cloud, and parses TouchDevelop scripts / compiles
  them; as an accident, it is also used to run a local node server when
  developing
* `node-webkit`:
* `officemix`:
* `rt`: various run-time support libraries for the TouchDevelop application:
  in-browser storage, cloud connection, promises, DOM utilities...
* `runner`: the run-time system for *generated* TouchDevelop apps; that is, once
  a TouchDevelop script is packaged as an app (webapp, cordova app, etc.),
  `runner.html` is the entry point
* `shell`:
* `storage`: code for syncing your locally-stored scripts and the cloud storage,
  in the TouchDevelop application
* `tools`: internal tools that are part of the build (pre-processing)
* `www`: the base files that make up the TouchDevelop website (html and css)

### Structure of the generated website / app

When packaged, as the website or as an app, the directory structure is flat.
That is, the CSS and HTML files from `www/` as well as the generated `.js` files
from `build/` all end up in the same directory. That way, `index.html` can refer
to `main.js` without worrying.

When running locally (via `jake run`), the local node server knows where to find
the right files to give the illusion that all files are at the root `/` of the
web server.
