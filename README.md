![](https://az31353.vo.msecnd.net/c04/uxoj.png)
# TouchDevelop

TouchDevelop is a touch-friendly app creation environment for iPad, iPhone, Android, Windows, Mac, Linux developed with <3 at Microsoft Reasearch. Our mobile-friendly editor makes coding fun, even on your phone or tablet!

**This repo contains the source code of
the TouchDevelop editor.** If you are looking
to write TouchDevelop scripts, you probably
want to go to touchdevelop.com:
* **stable:** https://www.touchdevelop.com/app
* **beta:** https://www.touchdevelop.com/app/beta


## what's it in this repo?

The repo is mostly written in [Typescript](http://www.typescriptlang.org/) with tiny pieces
of HTML gluing.

This repo contains the source code for:
* the browser client
 * the compiler
 * the editor
 * the runtime
* the node.js client

However, you will not find the cloud backend running on
https://www.touchdevelop.com that takes care of storing and managing the scripts.

## how can I contribute?

There are many ways to [contribute](https://github.com/Microsoft/TouchDevelop/blob/master/CONTRIBUTING.md) to TypeScript.
* [Submit bugs](https://github.com/Microsoft/TouchDevelop/issues) and help us verify fixes as they are checked in.
* Review the [source code changes](https://github.com/Microsoft/TouchDevelop/pulls).
* [Contribute bug fixes or features](https://github.com/Microsoft/TouchDevelop/blob/master/CONTRIBUTING.md).

## how to build

In order to build TouchDevelop, ensure that you have [Git](http://git-scm.com/downloads) and [Node.js](http://nodejs.org/) installed.

Clone a copy of the repo:

    git clone https://github.com/Microsoft/TouchDevelop.git

Change to the TouchDevelop directory:

    cd TouchDevelop

Install Jake tools and dev dependencies:

    npm install -g jake
    npm install

Build the tree

Use one of the following to build and test:

    jake            # Build locally

## how to run this thing locally

After building, you can run TouchDevelop from a local node server by running

    td
