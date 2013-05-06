importScripts('http://localhost:8000/lib/uuid.core.js');
importScripts('http://localhost:8000/lib/kamino.js');
importScripts('http://localhost:8000/lib/message_channel.js');

this.addEventListener( 'message', function( event ) {
  var messageEvent = MessageChannel.decodeEvent( event );

  if( messageEvent.data['type'] === 'DocumentHasLoaded' ) {
    var port = messageEvent.ports[0];
    port.addEventListener( 'message', function( event ) {
      messageEvent.ports[0].postMessage( event.data );
    });
    port.start();
  }

  MessageChannel.propagateEvent( messageEvent );
});

