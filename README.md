![](https://az31353.vo.msecnd.net/c04/uxoj.png)
# TouchDevelop

TouchDevelop is a touch-friendly app creation environment for iPad, iPhone, Android, Windows, Mac, Linux developed with <3 at Microsoft Reasearch. Our mobile-friendly editor makes coding fun, even on your phone or tablet!

Try it now in any browser:
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

## how to build

Make sure you've got all the dev dependencies ready.

    npm install

Build the tree

    jake

## how to run this thing locally

After building, you can run TouchDevelop from a local node server by running

    td

## how do i run the tests

Just write test...

    test
