This package contains the shell for running touchdevelop.

## Instructions for creating a local drop

Install this npm package with:

    npm install -g http://aka.ms/tdnpm

Create an empty folder, navigate there in your command prompt and run:

    touchdevelop --pkg

This will download node executables and the latest version of the TouchDevelop
npm package.

Now, if you're on Windows run:

    touchdevelop.cmd

and if you're on Linux or Mac OS X run:

    ./touchdevelop.sh

This will start the proxy server from the local directory, using the local copy
of node. When the proxy server starts, it will print out something like:

    Editor URL: http://localhost:4242/editor/#td_deployment_key=6780fc9fb75462b520b5b8bb0d3e4f203bcec1b0

Now, navigate to that URL in your browser and follow the tutorial activity
you want available offline.
