if( _.isFunction( this.Worker ) ) {
  QUnit.module("MessageChannel - web worker", {
    teardown: function() {
      if( MessageChannel.reset ) {
        MessageChannel.reset();
      }
    }
  });

  test("Assert not file://", function() {
    ok(window.location.protocol !== 'file:', "Please run the tests using a web server of some sort, not file://");
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
