## MessageChannel.js

MessageChannel.js proposes an implementation of the [_channel messaging_ described in the
HTML5
specification](http://www.w3.org/TR/webmessaging/#channel-messaging).

##### Compatibility

It is important to note that **the MessageChannel.js communication can only work
with browser that supports `window.postMessage`.**

## Build Tools

MessageChannel.js uses [Grunt](http://gruntjs.com/) to automate building and
testing.

### Setup

Before you use any of the commands below, make sure you have
installed node.js, which includes npm, the node package manager.

If you haven't before, install the `grunt` CLI tool:

```sh
$ npm install -g grunt-cli
```

This will put the `grunt` command in your system path, allowing it to be
run from any directory.

Next, install Conductor's dependencies:

```sh
$ npm install
```

This will install all of the packages that MessageChannel's Gruntfile relies
on into the local `node_modules` directory.

### Tests

Run the MessageChannel tests by starting a test server:

```
grunt server
```

Once the server is running, visit `http://localhost:8000/tests` in your
browser.
