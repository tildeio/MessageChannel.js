var messageHandlers = [],
    self = this;

var _addEventListener = function( messageHandler ) {
  if( window.addEventListener ) {
    window.addEventListener( 'message', messageHandler, false );
  } else {
    window.attachEvent( 'onmessage', messageHandler );
  }
};

var addTrackedEventListener = function( messageHandler ) {
  _addEventListener( messageHandler );
  messageHandlers.push( messageHandler );
};


var _removeEventListener = function( messageHandler) {
  if( window.removeEventListener ) {
    window.removeEventListener('message', messageHandler);
  } else {
    window.detachEvent('onmessage', messageHandler);
  }
};

var removeEventListeners = function() {
  var messageHandler;

  while( messageHandler = messageHandlers.pop() ) {
    _removeEventListener( messageHandler );
  }
};

var cleanDOM = function() {
  var iframes = document.getElementsByTagName('iframe');
  for( var index=0 ; index<iframes.length ; index++) {
    iframes[index].parentNode.removeChild( iframes[index] );
  }
};

QUnit.module("MessageChannel - integration");

test("Assert not file://", function() {
  ok(window.location.protocol !== 'file:', "Please run the tests using a web server of some sort, not file://");
});

QUnit.module("MessageChannel - window", {
  teardown: function() {
    if( MessageChannel.reset ) {
      MessageChannel.reset();
    }
    cleanDOM();
    removeEventListeners();
  }
});

test("An iframe can send and receive messages through a fake message port", function() {
  expect(3);
  var destinationUrl = window.location.protocol + "//" + window.location.hostname + ":" + (parseInt(window.location.port, 10) + 1),
      iFrame;

  iFrame = document.createElement('iframe');
  iFrame .setAttribute('src', destinationUrl + "/tests/fixtures/iframe.html");

  var messageHandler = function( event ) {
    var port;

    if( event.data.initialization ) {
      port = event.ports[0];

      port.addEventListener( 'message', function(event) {
        if( event.data.initialized ) {
          ok(true, "an iframe can send a message through a port");
          port.postMessage({messageToIframe: true});
        } else if ( event.data.messageFromIframe ) {
          ok(true, "an iframe can receive a message through a port");
          start();
        }
      });
      port.start();

      ok(true, "an iframe can communicate through `window.postMessage`");
      this.Window.postMessage( iFrame.contentWindow, { initialization: true }, destinationUrl, []);
    }
  };

  addTrackedEventListener( messageHandler );

  stop();
  document.body.appendChild( iFrame );
});

QUnit.module("window's message event handlers", {
  teardown: function() {
    removeEventListeners();
    cleanDOM();
  }
});

test("Multiple message listeners can be added to a window", function() {
  expect(2);

  var host = window.location.protocol + "//" + window.location.host,
      messageHandler1 = function(event) {
        equal( event.data, 'test', "The first handler is called");
      },
      messageHandler2 = function(event) {
        equal( event.data, 'test', "The second handler is called");
        start();
      };

  addTrackedEventListener( messageHandler1 );
  addTrackedEventListener( messageHandler2 );

  stop();
  self.Window.postMessage(window, 'test', host, []);
});

test("A message handler can be removed more than once", function() {
  expect(0);

  var host = window.location.protocol + "//" + window.location.host,
      messageHandler = function(event) {
        equal( event.data, 'test', "The handler is called");
      };

  _addEventListener( messageHandler );

  _removeEventListener( messageHandler );
  _removeEventListener( messageHandler );
});

test("A user agent can receive unencoded messages", function() {
  expect(1);
  var host = window.location.protocol + "//" + window.location.hostname,
      iFramePort = parseInt(window.location.port, 10) + 1,
      iFrameOrigin = host + ':' + iFramePort,
      iFrameURL = iFrameOrigin + "/tests/fixtures/unencoded_message.html",
      iFrame;

  iFrame = document.createElement('iframe');
  iFrame.setAttribute('src', iFrameURL);

  var messageHandler = function( event ) {
    equal( event.data, "unencoded message", 'An unencoded event can be received');
    start();
  };

  addTrackedEventListener( messageHandler );

  stop();
  document.body.appendChild( iFrame );
});

QUnit.module("MessageChannel - event propagation", {
  teardown: function() {
    if( MessageChannel.reset ) {
      MessageChannel.reset();
    }
    cleanDOM();
    removeEventListeners();
  }
});

test("A port can be passed through and still be used to communicate", function() {
  expect(1);
  var host = window.location.protocol + "//" + window.location.hostname,
      iFramePort = parseInt(window.location.port, 10) + 1,
      iFrameOrigin = host + ':' + iFramePort,
      iFrameURL = iFrameOrigin + "/tests/fixtures/parent_iframe.html",
      iFrame;

  iFrame = document.createElement('iframe');
  iFrame.setAttribute('src', iFrameURL);

  var mc = new MessageChannel();

  mc.port1.addEventListener( 'message', function( event ) {
    start();
    equal(event.data, 'Copy that', "A window can receive events from a port passed between windows");
  });
  mc.port1.start();

  var messageHandler = function( event ) {
    if( event.data.childFrameLoaded ) {
      this.Window.postMessage(iFrame.contentWindow, {openCommunication: true}, iFrameOrigin, [mc.port2]);
    }
  };

  addTrackedEventListener( messageHandler );

  stop();
  document.body.appendChild( iFrame );
});

test("A port is sent with its message queue", function() {
  expect(1);
  var host = window.location.protocol + "//" + window.location.hostname,
      iFramePort = parseInt(window.location.port, 10) + 1,
      iFrameOrigin = host + ':' + iFramePort,
      iFrameURL = iFrameOrigin + "/tests/fixtures/message_queue_iframe.html",
      iFrame,
      mc = new MessageChannel();

  iFrame = document.createElement('iframe');
  iFrame.setAttribute('src', iFrameURL);

  mc.port1.addEventListener( 'message', function(event) {
    start();
    equal(event.data.messageFromIframe, true, "The message was received by the port");
  });
  //Enqueue a message before sending the port
  mc.port1.postMessage({messageToIframe: true});

  mc.port1.start();

  var messageHandler = function( event ) {
    if( event.data.initialization ) {
      this.Window.postMessage( iFrame.contentWindow, {initialization: true}, iFrameOrigin, [mc.port2] );
    }
  };

  addTrackedEventListener( messageHandler );

  stop();
  document.body.appendChild( iFrame );
});

QUnit.module("MessageChannel - MessagePort", {
  teardown: function() {
    if( MessageChannel.reset ) {
      MessageChannel.reset();
    }
    cleanDOM();
    removeEventListeners();
  }
});

test("A closed port doesn't call the associated callbacks", function() {
  expect(1);
  var host = window.location.protocol + "//" + window.location.hostname,
      iFramePort = parseInt(window.location.port, 10) + 1,
      iFrameOrigin = host + ':' + iFramePort,
      iFrameURL = iFrameOrigin + "/tests/fixtures/closed_port.html",
      iFrame;

  iFrame = document.createElement('iframe');
  iFrame.setAttribute('src', iFrameURL);

  var messageHandler = function( event ) {
    if( event.data.childFrameLoaded ) {
      var port = event.ports[0];
      port.addEventListener( 'message', function(event) {
        ok(false, "A closed port doesn't receive messages");
      });
      port.start();

      port.close();
      Window.postMessage(iFrame.contentWindow, { openCommunication: true }, iFrameOrigin);
    } else if ( event.data.closedPort ) {
      ok(true);
      start();
    }
  };

  addTrackedEventListener( messageHandler );

  stop();
  document.body.appendChild( iFrame );
});
