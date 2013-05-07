importScripts('http://localhost:8000/lib/uuid.core.js');
importScripts('http://localhost:8000/lib/kamino.js');
importScripts('http://localhost:8000/lib/message_channel.js');

this.addEventListener( 'message', function( event ) {
  if( event.data['type'] === 'DocumentHasLoaded' ) {
    var port = event.ports[0];

    port.addEventListener( 'message', function( event ) {
      port.postMessage( event.data );
    });

    port.start();
  }
});

