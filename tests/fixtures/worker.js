importScripts('http://localhost:8000/lib/uuid.core.js');
importScripts('http://localhost:8000/lib/kamino.js');
importScripts('http://localhost:8000/lib/message_channel.js');

var mc = new MessageChannel();

mc.port1.addEventListener( 'message', function(event) {
  // A worker can receive messages through a port
  if( event.data.messageToWorker ) {
    event.ports[0].postMessage({messageFromWorker: true});
  }
});
mc.port1.start();

this.addEventListener( 'message', function( event ) {
  if( event.data.initialization ) {
    Worker.postMessage( this, { sendPort: true }, [mc.port2] );
  }
}, false);
