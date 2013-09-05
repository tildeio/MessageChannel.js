if( MessageChannel && MessageChannel.reset ) {
  var originalPostMessage, kaminoStringify, kaminoParse;

  QUnit.module("MessageChannel", {
    teardown: function() {
      MessageChannel.reset();
    }
  });

  test("MessageChannel() creates 2 entangled ports", function() {
    var mc = new MessageChannel();

    equal( mc.port1, mc.port2._getEntangledPort(), "The port 1 is the entangled port of port 2");
    equal( mc.port2, mc.port1._getEntangledPort(), "The port 2 is the entangled port of port 1");
  });

  QUnit.module("MessagePort", {
    setup: function() {
      originalPostMessage = window.postMessage;
      kaminoStringify = Kamino.stringify;
      kaminoParse = Kamino.parse;
    },

    teardown: function() {
      Kamino.stringify = kaminoStringify;
      Kamino.parse = kaminoParse;
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
    var mc = new MessageChannel(),
        origin = window.location.protocol + "//" + window.location.host;

    stop();

    mc.port1._currentTarget = window;
    mc.port1.destinationUrl = origin;

    Kamino.stringify = function() {
      var args = Array.prototype.slice.apply(arguments),
          source = args[0];
      equal( source.event.data, "Sad things are sad", "The message is encoded using Kamino");
      return kaminoStringify.apply( null, args );
    };

    Kamino.parse = function(source) {
      ok(true, "The message is decoded using Kamino");
      start();
      return {event: {}};
    };
    mc.port2.start();

    mc.port1.postMessage( "Sad things are sad" );
  });

  test("When the port is entangled to a port sent to another user agent, the current target is preserved", function() {
    expect(1);
    var mc = new MessageChannel(),
        origin = window.location.protocol + "//" + window.location.host;

    mc.port2._currentTarget = window;

    mc.port1.postMessage( 'Sad things are sad' );

    equal(mc.port2._currentTarget, window, "Current target is not modified");
  });

  test("Messages can be passed between entangled, non-transferred ports", function() {
    stop();
    expect(1);

    var mc = new MessageChannel(),
        port1 = mc.port1,
        port2 = mc.port2;

    port2.addEventListener('message', function (event) {
      start();
      equal(event.data, 'test message', "message received");
    });

    port1.start();
    port2.start();
    port1.postMessage('test message');
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
}
