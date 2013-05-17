var messageHandlers = [],
    parentFrame,
    originalPostMessage,
    Window = this.Window;

var removeMessageHandlers = function() {
  var messageHandler;

  while( messageHandler = messageHandlers.pop() ) {
    if( window.removeEventListener ) {
      window.removeEventListener('message', messageHandler);
    } else {
      window.detachEvent('onmessage', messageHandler);
    }
  }
};

QUnit.module("MessageChannel", {
  teardown: function() {
    MessageChannel.reset();
  }
});

test("Assert not file://", function() {
  ok(window.location.protocol !== 'file:', "Please run the tests using a web server of some sort, not file://");
});

test("MessageChannel() creates 2 entangled ports", function() {
  var mc = new MessageChannel();

  equal( mc.port1, mc.port2._getEntangledPort(), "The port 1 is the entangled port of port 2");
  equal( mc.port2, mc.port1._getEntangledPort(), "The port 2 is the entangled port of port 1");
});

QUnit.module("MessagePort", {
  setup: function() {
    originalPostMessage = window.postMessage;
  },

  teardown: function() {
    MessageChannel.reset();
    window.postMessage = originalPostMessage;
  }
});

test("A MessagePort has a default uuid", function() {
  expect(2);
  var mp = MessageChannel._createPort();

  equal(mp.uuid.constructor, String, "A MessagePort has a uuid as a string");
  notEqual(mp.uuid, "", "A MessagePort has a uuid as a non empty string");
});

test("A MessagePort can be initialized with a uuid", function() {
  expect(2);
  var mp = MessageChannel._createPort("myUuid");

  equal(mp.uuid.constructor, String, "A MessagePort has a uuid as a string");
  equal(mp.uuid, "myUuid", "A MessagePort be initialized with an Uuid");
});

test("Starting the port dispatches the stored messages in the queue", function() {
  var dispatched = false,
      clock = sinon.useFakeTimers();
  expect(2);

  var mp = MessageChannel._createPort();
  mp._messageQueue.push("a", "b");
  mp.dispatchEvent = function() {
    dispatched = true;
  };

  mp.start();
  ok(!dispatched, "The event is queued but not dispatched");

  clock.tick(1);
  ok(dispatched, "dispatchEvent is called when starting the communication on the port");

  clock.restore();
});

test("When the port isn't opened, the events are queued", function() {
  expect(1);
  var mp = MessageChannel._createPort();

  mp.dispatchEvent = function() {
    ok(false, "dispatchEvent should not be called");
  };

  mp._enqueueEvent( 'something' );

  equal(mp._messageQueue.length, 1, "The message is queued");
});

test("When the port is opened, the events are dispatched", function() {
  expect(2);
  var mp = MessageChannel._createPort();

  mp.dispatchEvent = function() {
    ok(true, "dispatchEvent should be called");
  };

  mp.start();
  mp._enqueueEvent( 'something' );

  equal(mp._messageQueue.length, 0, "The message is not queued");
});

test("When the port isn't entangled, nothing is sent", function() {
  expect(1);
  var mp = MessageChannel._createPort();
  mp.start();
  window.postMessage = function() {
    ok(false, "window.postMessage should not be called");
  };
  mp.postMessage( 'Sad things are sad' );
  equal(mp._messageQueue.length, 0, "The message is not queued");
});

test("When the port is entangled to a port sent to another user agent, stringified data is sent to the entangled port", function() {
  expect(2);
  var mp1 = MessageChannel._createPort(),
      mp2 = MessageChannel._createPort('myUuid'),
      kaminoStringify = Kamino.stringify;

  mp1._entangledPortUuid = mp2.uuid;
  mp1._currentTarget = window;
  mp1.destinationUrl = "http://itworksforme";

  Kamino.stringify = function() {
    return 'an encoded string';
  };

  window.postMessage = function( message, targetOrigin) {
    equal(message, "an encoded string", "The message is encoded");
    equal(targetOrigin, "http://itworksforme", "The message is sent to the right url");
  };
  mp1.postMessage( 'Sad things are sad' );

  Kamino.stringify = kaminoStringify;
});

test("When the port is entangled to a port sent to another user agent, the current target is preserved", function() {
  expect(2);
  var mp1 = MessageChannel._createPort(),
      mp2 = MessageChannel._createPort('myUuid');

  mp1._entangledPortUuid = mp2.uuid;
  mp1._currentTarget = window;
  mp1.destinationUrl = "http://itworksforme";
  mp2._currentTarget = window;

  window.postMessage = function( message, targetOrigin) {
    ok(true, "the message is sent");
  };
  mp1.postMessage( 'Sad things are sad' );

  deepEqual(mp2._currentTarget, window, "Current target is not modified");
});

test("When the port is entangled to a port not sent to another user agent, stringified data is queued to the entangled port", function() {
  expect(3);
  var mp1 = MessageChannel._createPort(),
      mp2 = MessageChannel._createPort('myUuid'),
      kaminoStringify = Kamino.stringify;

  mp1._entangledPortUuid = mp2.uuid;

  Kamino.stringify = function() {
    return 'an encoded string';
  };

  window.postMessage = function( message, targetOrigin) {
    ok(false, "The message should not be sent");
  };
  equal(mp2._messageQueue.length, 0, "The message queue is initially empty");
  mp1.postMessage( 'Sad things are sad' );
  equal(mp2._messageQueue.length, 1, "The event is queued");
  equal(mp2._messageQueue[0], "an encoded string", "The queued event is encoded");

  Kamino.stringify = kaminoStringify;
});

QUnit.module("MessagePort - EventTarget", {
  teardown: function() {
    MessageChannel.reset();
  }
});

test("Multiple listeners can be added to a message port", function() {
  var mp = MessageChannel._createPort();

  deepEqual(mp._listeners, {}, "A message port has no listeners by default");
  mp.addEventListener( 'message', function() { });
  mp.addEventListener( 'message',  function() { });

  equal(mp._listeners['message'].length, 2, "A message port can have listeners");
});

test("Events can be dispatched to event listeners", function() {
  expect(1);
  var mp = MessageChannel._createPort();

  mp.addEventListener( 'message', function( data ) {
    equal(data, "I hear you", "The event listener is called with the event");
  });

  mp.dispatchEvent( "I hear you" );
});

test("When no listeners have been set, dispatchEvent does nothing", function() {
  expect(0);
  var mp = MessageChannel._createPort();

  mp.dispatchEvent( "I hear you" );
});

test("A listener can be removed", function() {
  expect(2);
  var mp = MessageChannel._createPort(),
      listener1 = function() {
        ok(true, "An added listener should be called");
      },
      listener2 = function( data ) {
        ok(false, "A removed listener should not be called");
      },
      listener3 = function() {
        ok(true, "An added listener should be called");
      };

  mp.addEventListener( 'message', listener1 );
  mp.addEventListener( 'message', listener2 );
  mp.addEventListener( 'message', listener3 );

  mp.removeEventListener( 'message', listener2 );
  mp.dispatchEvent( "I hear you" );
});

QUnit.module("MessageChannel - window", {
  teardown: function() {
    MessageChannel.reset();
    document.body.removeChild( parentFrame );
    removeMessageHandlers();
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
      Window.postMessage( parentFrame.contentWindow, { initialization: true }, destinationUrl);
    }
  };

  if( window.addEventListener ) {
    window.addEventListener( 'message', messageHandler, false );
  } else {
    window.attachEvent( 'onmessage', messageHandler );
  }
  messageHandlers.push( messageHandler );

  stop();
  document.body.appendChild( parentFrame );
});

QUnit.module("window's message event handlers", {
  teardown: function() {
    removeMessageHandlers();
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

  if( window.addEventListener ) {
    window.addEventListener('message', messageHandler1, false);
    window.addEventListener('message', messageHandler2, false);
  } else {
    window.attachEvent('onmessage', messageHandler1);
    window.attachEvent('onmessage', messageHandler2);
  }
  messageHandlers.push( messageHandler1 );
  messageHandlers.push( messageHandler2 );

  stop();
  Window.postMessage(window, 'test', host);
});

if( !!this.Worker ) {
  QUnit.module("MessageChannel - web worker", {
    teardown: function() {
      MessageChannel.reset();
    }
  });

  test("A worker can send and receive messages through a fake message port", function() {
    expect(2);
    var destinationUrl = window.location.protocol + "//" + window.location.hostname + ":" + (parseInt(window.location.port, 10) + 1),
        workerBaseUrl = window.location.protocol + '//' + window.location.host,
        worker = new Worker( workerBaseUrl + '/tests/fixtures/worker.js'),
        port;

    worker.addEventListener('message', function( event ) {
      if( event.data.sendPort ) {
        port = event.ports[0];

        port.addEventListener( 'message', function(event) {
          if ( event.data.messageFromWorker ) {
            ok(true, "a worker can receive a message through a port");
            start();
          }
        });
        port.start();

        ok(true, "a worker can communicate through `worker.postMessage`");

        // A worker can receive messages through a port
        port.postMessage({messageToWorker: true});
      }
    }, false);

    stop();
    Worker.postMessage( worker, {initialization: true}, [] );
  });

  test("A port is sent with its message queue", function() {
    expect(1);
    var workerBaseUrl = window.location.protocol + '//' + window.location.host,
        worker = new Worker( workerBaseUrl + '/tests/fixtures/worker_events.js'),
        mc = new MessageChannel();

    mc.port1.addEventListener( 'message', function(event) {
      start();
      equal(event.data, "Yes, I'm alive!!", "The worker communicated through the port");
    });
    //Enqueue a message before sending the port
    mc.port1.postMessage("I'm alive!!");

    stop();
    mc.port1.start();

    Worker.postMessage( worker, {type: 'DocumentHasLoaded'}, [mc.port2] );
  });
}

QUnit.module("MessageChannel - event propagation", {
  teardown: function() {
    MessageChannel.reset();
    document.body.removeChild( parentFrame );
    removeMessageHandlers();
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

  if( window.addEventListener ) {
    window.addEventListener('message', messageHandler);
  } else {
    window.attachEvent('onmessage', messageHandler);
  }
  messageHandlers.push( messageHandler );

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

  if( window.addEventListener ) {
    window.addEventListener( 'message', messageHandler, false );
  } else {
    window.attachEvent( 'onmessage', messageHandler );
  }
  messageHandlers.push( messageHandler );

  stop();
  document.body.appendChild( parentFrame );
});
