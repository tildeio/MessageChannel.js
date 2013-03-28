(function(root) {
  if( !window['MessageChannel'] ) {
    window.messagePorts = {};
    function MessagePort( uuid ) {
      this._entangledPortUuid = null;
      this.destinationUrl = null;
      this._listeners = {};
      this._messageQueue = [],
      this._messageQueueEnabled = false,

      this.uuid = uuid || UUID.generate();
      window.messagePorts[this.uuid] = this;
    };

    MessagePort.prototype = {
      start: function() {
        var event;
        while( event = this._messageQueue.shift() ) {
          this.dispatchEvent( event );
        }
        this._messageQueueEnabled = true;
      },

      close: function() {
        if( this._entangledPortUuid ) {
          this._getEntangledPort()._entangledPortUuid = null;
          this._entangledPortUuid = null;

          // /!\ Probably need to send that (?)
        }
      },

      postMessage: function( message ) {
        // Numbers refer to step from the W3C specs. It shows how simplified things are
        // 1- Let target port be the port with which source port is entangled, if any
        var target = this._getEntangledPort();
        // 5- Let message clone be the result of obtaining a structured clone of the message argument
            messageClone = Kamino.stringify({
              event: {
                messageChannel: true,
                data: message,
                ports: [target]
              }
            });

        // 8- If there is no target port (i.e. if source port is not entangled), then abort these steps.
        if(!target) {
          return;
        }

        // 12- Add the event to the port message queue of target port.
        this.getCurrentTarget().postMessage(messageClone, this.destinationUrl);
      },

      _getPort: function( portClone, messageEvent ) {
        var loadPort = function(uuid) {
          var port = window.messagePorts[uuid] || MessageChannel.createPort(uuid);
          return port;
        }

        var port = loadPort(portClone.uuid);
        port._entangledPortUuid = portClone._entangledPortUuid;
        port._getEntangledPort()._entangledPortUuid = port.uuid;
        port.setCurrentTarget( messageEvent.source );
        port.destinationUrl = messageEvent.origin;

        return port;
      },

      _getEntangledPort: function() {
        if( this._entangledPortUuid ) {
          return window.messagePorts[ this._entangledPortUuid ] || MessageChannel.createPort(this._entangledPortUuid);
        } else {
          return null;
        }
      },

      addEventListener: function( type, listener ) {
        if (typeof this._listeners[type] == "undefined"){
          this._listeners[type] = [];
        }

        this._listeners[type].push( listener );
      },

      removeEventListener: function( type, listener) {
        if (this._listeners[type] instanceof Array){
          var listeners = this._listeners[type];
          for (var i=0, len=listeners.length; i < len; i++){
            if (listeners[i] === listener){
              listeners.splice(i, 1);
              break;
            }
          }
        }
      },

      dispatchEvent: function( data ) {
        var listeners = this._listeners['message'];
        if( listeners ) {
          for (var i=0, len=listeners.length; i < len; i++){
            listeners[i].call(this, data);
          }
        }
      },

      _enqueueEvent: function( data ) {
        if(this._messageQueueEnabled) {
          this.dispatchEvent( data );
        } else {
          this._messageQueue.push( data );
        }
      }
    };

    function MessageChannel () {
      var port1 = MessageChannel.createPort(),
          port2 = MessageChannel.createPort(),
          channel;

      port1._entangledPortUuid = port2.uuid;
      port2._entangledPortUuid = port1.uuid;

      channel = {
        port1: port1,
        port2: port2
      };

      return channel;
    };

    MessageChannel.createPort = function() {
      var args = arguments,
          currentTarget;
      var F = function() {
        return MessagePort.apply(this, args);
      }
      F.prototype = MessagePort.prototype;
      F.prototype.setCurrentTarget = function( newTarget ) {
        currentTarget = newTarget;
      };
      F.prototype.getCurrentTarget = function() {
        return currentTarget;
      };
      var object = new F();

      // var onMessageHandler = function() {};
      // Object.defineProperty(object, "onmessage", {
        // get : function(){ return onMessageHandler; },
        // set : function( newHandler ) {
          // onMessageHandler = newHandler;
          // object.addEventListener('message', newHandler);
          // object.start();
        // },
        // enumerable : false,
        // configurable : false
      // });

      // return the new object
      return object;
    };

    MessageChannel.decodeEvent = function( messageEvent ) {
      var fakeEvent = {},
          data = Kamino.parse( messageEvent.data ),
          event;

      if( data['event'] ) {
        event = data.event;
        if( event['ports'] ) {
          var ports = event.ports;
          fakeEvent.ports = [];
          for(var i=0; i< ports.length ; i++) {
            fakeEvent.ports.push( MessagePort.prototype._getPort( ports[i], messageEvent ) );
          }
        }
        fakeEvent.data = event['data'];
        fakeEvent.messageChannel = event['messageChannel'];
      } else {
        fakeEvent.data = messageEvent.data;
      }

      return fakeEvent;
    };

    MessageChannel.propagateEvent = function( fakeEvent ) {
      var ports;
      if( fakeEvent.messageChannel ) {
        ports = fakeEvent.ports;
        for( var i=0 ; i<ports.length ; i++) {
          ports[i]._enqueueEvent( fakeEvent );
        }
      }
    };

    MessageChannel.reset = function() {
      window.messagePorts = {};
    };

    MessageChannel.postMessagePorts = function( source, message, targetOrigin, ports ) {
      var data = Kamino.stringify( {event: {data: message, ports: ports}} ),
          entangledPort;
      source.postMessage(data, targetOrigin);

      for( var i=0 ; i<ports.length ; i++) {
        entangledPort = ports[i]._getEntangledPort();
        entangledPort.setCurrentTarget( source );
        entangledPort.destinationUrl = targetOrigin;
      }
    };

    window.MessageChannel = MessageChannel;
    window.MessagePort = MessagePort;
  } else {
    window.MessageChannel.propagateEvent = function() {};
    window.MessageChannel.decodeEvent = function( messageEvent ) {
      return messageEvent;
    };
    window.MessageChannel.postMessagePorts = function( source, message, targetOrigin, ports ) {
      source.postMessage( message, targetOrigin, ports );
    };
  }
}).call(this);
