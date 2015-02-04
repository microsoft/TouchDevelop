![](https://az31353.vo.msecnd.net/c04/uxoj.png)
# TouchDevelop

TouchDevelop is a touch-friendly app creation environment for iPad, iPhone, Android, Windows, Mac, Linux developed with <3 at Microsoft Reasearch. Our mobile-friendly editor makes coding fun, even on your phone or tablet!

**This repo contains the source code of
the TouchDevelop editor.** If you are looking
to write TouchDevelop scripts, you probably
want to go to touchdevelop.com:
* **stable:** https://www.touchdevelop.com/app
* **beta:** https://www.touchdevelop.com/app/beta

Other pages of interrest:
* landing page: https://www.touchdevlop.com
* blog: https://www.touchdevelop.com/blog
* Hour Of Code tutorials: https://www.touchdevelop.com/hoc

## what's in this repo

The repo is mostly written in [Typescript](http://www.typescriptlang.org/) with tiny pieces
of HTML gluing.

This repo contains the source code for:
* the browser client
 * the compiler
 * the editor
 * the runtime
* the node.js client

However, you will not find the cloud backend running on
https://www.touchdevelop.com that takes care of storing and managing the scripts. The client uses the [cloud services](https://www.touchdevelop.com/help/cloudservices) provided by the TouchDevelop backend.

## how can I contribute

There are many ways to [contribute](https://github.com/Microsoft/TouchDevelop/blob/master/CONTRIBUTING.md) to TouchDevelop.

* [submit bugs](https://github.com/Microsoft/TouchDevelop/issues) and help us verify fixes as they are checked in.
* Review the [source code changes](https://github.com/Microsoft/TouchDevelop/pulls)
* [contribute bug fixes or features](https://github.com/Microsoft/TouchDevelop/blob/master/CONTRIBUTING.md).

If you're not a developer but still would like to help,
you've more tasks for you!

* [help translate the user inferface](https://touchdeveloptranslator.azurewebsites.net), do you use TouchDevelop and speak a foreign language? You can help!

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

## where are the docs

All the docs available online at
> https://www.touchdevelop.com/docs

The docs are
authored as TouchDevelop scripts in TouchDevelop itself. You can fork them
and send pull requests from TouchDevelop itself to update them.
