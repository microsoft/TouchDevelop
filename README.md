![](https://az31353.vo.msecnd.net/c04/uxoj.png)
# TouchDevelop

TouchDevelop is a touch-friendly app creation environment for iPad, iPhone,
Android, Windows, Mac, Linux developed with <3 at Microsoft Reasearch. Our
mobile-friendly editor makes coding fun, even on your phone or tablet!

Try it now in any browser:
* **stable:** https://www.touchdevelop.com/app
* **beta:** https://www.touchdevelop.com/app/beta


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

## Building

You need nodejs. Then, from this directory, run:

    npm install
    tsd reinstall
    jake

## Running

After building, you can run TouchDevelop from a local node server by running:

    jake run

## Tests

    jake test
