importScripts('http://localhost:8000/lib/uuid.core.js');
importScripts('http://localhost:8000/lib/kamino.js');
importScripts('http://localhost:8000/lib/message_channel.js');

var mc = new MessageChannel();

this.addEventListener( 'message', function( event ) {
  var messageEvent = MessageChannel.decodeEvent( event ),
      port;

  if( messageEvent.data.initialization ) {
    port = mc.port1;

    port.addEventListener( 'message', function(event) {
      if( event.data.messageToWorker ) {
        port.postMessage({messageFromWorker: true});
      }
    });
    port.start();
    port.postMessage({initialized: true});
  } else {
    MessageChannel.propagateEvent( messageEvent );
  }
});

Worker.postMessage( this, { initialization: true }, [mc.port2], "http://localhost:8000");
