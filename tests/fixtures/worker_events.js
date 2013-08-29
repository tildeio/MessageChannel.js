importScripts('/vendor/node-uuid.js');
importScripts('/vendor/kamino.js');
importScripts('/lib/message_channel.js');

this.addEventListener( 'message', function( event ) {
  if( event.data['type'] === 'DocumentHasLoaded' ) {
    var port = event.ports[0];

    port.addEventListener( 'message', function( event ) {
      port.postMessage( 'Yes, ' + event.data );
    });

    port.start();
  }
});

