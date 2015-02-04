![](https://az31353.vo.msecnd.net/c04/uxoj.png)
# TouchDevelop

TouchDevelop is a touch-friendly app creation environment for iPad, iPhone,
Android, Windows, Mac, Linux developed with <3 at Microsoft Reasearch. Our
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

    npm install jake -g # skip this step if you're on Windows
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

## Documentation

All the docs are available online at
[https://www.touchdevelop.com/docs](https://www.touchdevelop.com/docs).

The docs are authored as TouchDevelop scripts in TouchDevelop itself. You can
fork them and send pull requests from TouchDevelop itself to update them.
