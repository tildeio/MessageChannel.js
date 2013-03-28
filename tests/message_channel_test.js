QUnit.module("MessageChannel", {
  teardown: function() {
    MessageChannel.reset();
  }
});

test("Assert not file://", function() {
  ok(window.location.protocol !== 'file:', "Please run the tests using a web server of some sort, not file://");
});

test("MessageChannel() creates 2 entangled ports", function() {
  var mc = MessageChannel();

  equal( mc.port1, mc.port2.getEntangledPort(), "The port 1 is the enatngled port of port 2");
  equal( mc.port2, mc.port1.getEntangledPort(), "The port 2 is the enatngled port of port 1");
});

QUnit.module("MessagePort", {
  teardown: function() {
    MessageChannel.reset();
  }
});

test("A MessagePort object registers itself to the user agent based on its uuid", function() {
  var mp;

  deepEqual( window.messagePorts, {}, "The message ports map is initially empty" );

  mp = MessageChannel.createPort();

  equal( window.messagePorts[mp.uuid], mp, "The message port is registered");
});

test("A MessagePort has a default uuid", function() {
  expect(2);
  var mp = MessageChannel.createPort();

  equal(mp.uuid.constructor, String, "A MessagePort has a uuid as a string");
  notEqual(mp.uuid, "", "A MessagePort has a uuid as a non empty string");
});

test("A MessagePort can be initialized with a uuid", function() {
  expect(2);
  var mp = MessageChannel.createPort("myUuid");

  equal(mp.uuid.constructor, String, "A MessagePort has a uuid as a string");
  equal(mp.uuid, "myUuid", "A MessagePort be initialized with an Uuid");
});

test("Starting the port dispatches the stored messages in the queue", function() {
  expect(2);
  var mp = MessageChannel.createPort();
  mp._messageQueue.push("a", "b");
  mp.dispatchEvent = function() {
    ok(true, "dispatchEvent is called when starting the communication on the port");
  };

  mp.start();
});

test("When the port isn't opened, the events are queued", function() {
  expect(1);
  var mp = MessageChannel.createPort();

  mp.dispatchEvent = function() {
    ok(false, "dispatchEvent should not be called");
  };

  mp._enqueueEvent( 'something' );

  equal(mp._messageQueue.length, 1, "The message is queued");
});

test("When the port is opened, the events are dispatched", function() {
  expect(2);
  var mp = MessageChannel.createPort();

  mp.dispatchEvent = function() {
    ok(true, "dispatchEvent should be called");
  };

  mp.start();
  mp._enqueueEvent( 'something' );

  equal(mp._messageQueue.length, 0, "The message is not queued");
});

test("When the port isn't entangled, nothing is sent", function() {
  expect(0);
  var mp = MessageChannel.createPort();
  mp.start();
  window.postMessage = function() {
    ok(false, "window.postMessage should not be called");
  };
  mp.postMessage( 'Sad things are sad' );
});

test("When the port is entangled, stringified data is sent to the entangled port", function() {
  expect(2);
  var mp1 = MessageChannel.createPort(),
      mp2 = MessageChannel.createPort('myUuid');

  mp1._entangledPortUuid = mp2.uuid;
  // this is sad to have to do this
  mp1.setCurrentTarget( window );
  mp1.destinationUrl = "http://itworksforme";

  Kamino.stringify = function() {
    return 'an encoded string';
  };

  window.postMessage = function( message, targetOrigin) {
    equal(message, "an encoded string", "The message is encoded");
    equal(targetOrigin, "http://itworksforme", "The message is sent to the right url");
  };
  mp1.postMessage( 'Sad things are sad' );
});

// test("When setting the `onmessage` event handler, it dispatches all pending events", function() {
  // expect(1);
  // var mp = MessageChannel.createPort();

  // mp.start = function() {
    // ok(true, "Events are dispatched");
  // };
  // mp._enqueueEvent( 'something' );
  // mp.onmessage = function() {};
// });

QUnit.module("MessagePort - EventTarget", {
  teardown: function() {
    MessageChannel.reset();
  }
});

test("Muliple listeners can be added to a message port", function() {
  var mp = MessageChannel.createPort();

  deepEqual(mp._listeners, {}, "A message port has no listeners by default");
  mp.addEventListener( 'message', function() { });
  mp.addEventListener( 'message',  function() { });

  equal(mp._listeners['message'].length, 2, "A message port can have listeners");
});

test("Events can be dispatched to event listeners", function() {
  expect(1);
  var mp = MessageChannel.createPort();

  mp.addEventListener( 'message', function( data ) {
    equal(data, "I hear you", "The event listener is called with the event");
  });

  mp.dispatchEvent( "I hear you" );
});

test("When no listeners have been set, dispatchEvent does nothing", function() {
  expect(0);
  var mp = MessageChannel.createPort();

  mp.dispatchEvent( "I hear you" );
});

test("A listener can be removed", function() {
  expect(2);
  var mp = MessageChannel.createPort(),
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
