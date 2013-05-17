var messageHandlers = [],
    parentFrame,
    Window = this.Window;

var addTrackedEventListener = function( messageHandler ) {
  if( window.addEventListener ) {
    window.addEventListener( 'message', messageHandler, false );
  } else {
    window.attachEvent( 'onmessage', messageHandler );
  }
  messageHandlers.push( messageHandler );
};

var removeEventListeners = function() {
  var messageHandler;

  while( messageHandler = messageHandlers.pop() ) {
    if( window.removeEventListener ) {
      window.removeEventListener('message', messageHandler);
    } else {
      window.detachEvent('onmessage', messageHandler);
    }
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
    document.body.removeChild( parentFrame );
    removeEventListeners();
  }
});

test("An iframe can send and receive messages through a fake message port", function() {
  expect(3);
  var destinationUrl = window.location.protocol + "//" + window.location.hostname + ":" + (parseInt(window.location.port, 10) + 1);

  parentFrame = document.createElement('iframe');
  parentFrame.setAttribute('src', destinationUrl + "/tests/fixtures/iframe.html");

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
      Window.postMessage( parentFrame.contentWindow, { initialization: true }, destinationUrl, []);
    }
  };

  addTrackedEventListener( messageHandler );

  stop();
  document.body.appendChild( parentFrame );
});

QUnit.module("window's message event handlers", {
  teardown: function() {
    removeEventListeners();
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
  Window.postMessage(window, 'test', host);
});

QUnit.module("MessageChannel - event propagation", {
  teardown: function() {
    if( MessageChannel.reset ) {
      MessageChannel.reset();
    }
    document.body.removeChild( parentFrame );
    removeEventListeners();
  }
});

test("A port can be passed through and still be used to communicate", function() {
  expect(1);
  var host = window.location.protocol + "//" + window.location.hostname,
      iFramePort = parseInt(window.location.port, 10) + 1,
      iFrameOrigin = host + ':' + iFramePort,
      iFrameURL = iFrameOrigin + "/tests/fixtures/parent_iframe.html";

  parentFrame = document.createElement('iframe');
  parentFrame.setAttribute('src', iFrameURL);

  var mc = new MessageChannel();

  mc.port1.addEventListener( 'message', function( event ) {
    start();
    equal(event.data, 'Copy that', "A window can receive events from a port passed between windows");
  });
  mc.port1.start();

  var messageHandler = function( event ) {
    if( event.data.childFrameLoaded ) {
      Window.postMessage(parentFrame.contentWindow, {openCommunication: true}, iFrameOrigin, [mc.port2]);
    }
  };

  addTrackedEventListener( messageHandler );

  stop();
  document.body.appendChild( parentFrame );
});

test("A port is sent with its message queue", function() {
  expect(1);
  var host = window.location.protocol + "//" + window.location.hostname,
      iFramePort = parseInt(window.location.port, 10) + 1,
      iFrameOrigin = host + ':' + iFramePort,
      iFrameURL = iFrameOrigin + "/tests/fixtures/message_queue_iframe.html",
      mc = new MessageChannel();

  parentFrame = document.createElement('iframe');
  parentFrame.setAttribute('src', iFrameURL);

  mc.port1.addEventListener( 'message', function(event) {
    start();
    equal(event.data.messageFromIframe, true, "The message was received by the port");
  });
  //Enqueue a message before sending the port
  mc.port1.postMessage({messageToIframe: true});

  mc.port1.start();

  var messageHandler = function( event ) {
    if( event.data.initialization ) {
      Window.postMessage( parentFrame.contentWindow, {initialization: true}, iFrameOrigin, [mc.port2] );
    }
  };

  addTrackedEventListener( messageHandler );

  stop();
  document.body.appendChild( parentFrame );
});
