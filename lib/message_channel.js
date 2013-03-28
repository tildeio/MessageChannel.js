window.messagePorts = {};
(function(root) {
  window.disentangle = function( port1, port2 ) {
    if( port1 && port1._entangledPort ) {
      port1._entangledPort = null;
      port2._entangledPort = null;

      // /!\ Probably need to send that (?)
    }
  };

  function MessagePort( uuid ) {
    this._entangledPort = null;
    this.currentTarget = null;
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
      window.disentangle( this, this._entangledPort );
    },

    postMessage: function(data) {
      // 1- Let target port be the port with which source port is entangled, if any
      var target = this._entangledPort,
          uuid = target ? target.uuid : null,
      // 5- Let message clone be the result of obtaining a structured clone of the message argument
          messageClone = Kamino.stringify({target: uuid, data: data});

      // 8- If there is no target port (i.e. if source port is not entangled), then abort these steps.
      if(!target) {
        return;
      }

      // 12- Add the event to the port message queue of target port.
      this.currentTarget.postMessage(messageClone, this.destinationUrl);
    },

    getPort: function( portClone, messageEvent ) {
      var loadPort = function(uuid) {
        var port = window.messagePorts[uuid] || MessageChannel.createPort(uuid);
        return port;
      }

      var port = loadPort(portClone.uuid);
      port._entangledPort = loadPort( portClone._entangledPort.uuid );
      port._entangledPort._entangledPort = port;
      port.currentTarget = messageEvent.source;
      port.destinationUrl = messageEvent.origin;

      return port;
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

    enqueueEvent: function( data ) {
      if(this._messageQueueEnabled) {
        this.dispatchEvent( data );
      } else {
        this._messageQueue.push( data );
      }
    }
  };

  function MessageChannel () {
    // /!\ Ports should be owned by window/owner
    var port1 = MessageChannel.createPort(),
        port2 = MessageChannel.createPort(),
        channel;

    // /!\ This is not following closely the specs
    // See http://www.w3.org/TR/webmessaging/#entangle
    port1._entangledPort = port2;
    port2._entangledPort = port1;

    channel = {
      port1: port1,
      port2: port2
    };

    return channel;
  };

  MessageChannel.createPort = function() {
    var args = arguments;
    var F = function() {
      return MessagePort.apply(this, args);
    }
    F.prototype = MessagePort.prototype;
    var object = new F();

    var onMessageHandler = function() {};
    Object.defineProperty(object, "onmessage", {
      get : function(){ return onMessageHandler; },
      set : function( newHandler ) {
        onMessageHandler = newHandler;
        object.addEventListener('message', newHandler);
        object.start();
      },
      enumerable : false,
      configurable : false
    });

    // return the new object
    return object;
  };

  MessageChannel.decodeEvent = function( messageEvent ) {
    var fakeEvent = {};

    fakeEvent.data = Kamino.parse( messageEvent.data );
    if( fakeEvent.data['ports'] ) {
      var ports = fakeEvent.data.ports;
      fakeEvent.ports = [];
      for(var i=0; i< ports.length ; i++) {
        fakeEvent.ports.push( MessagePort.prototype.getPort( ports[i], messageEvent ) );
      }
    } else {
      fakeEvent.ports = messageEvent.ports;
    }
    fakeEvent.type = fakeEvent.data['type'] || messageEvent.type;

    return fakeEvent;
  };

  MessageChannel.propagateEvent = function( fakeEvent ) {
    if( fakeEvent.data['target']) {
      port = window.messagePorts[ fakeEvent.data.target];

      port.enqueueEvent( fakeEvent.data.data );
    }
  };

  MessageChannel.reset = function() {
    window.messagePorts = {};
  };

  MessageChannel.postMessagePorts = function( source, message, targetOrigin, ports ) {
    var data = Kamino.stringify( {type: message, ports: ports} );
    source.postMessage(data, targetOrigin);

    for( var i=0 ; i<ports.length ; i++) {
      ports[i]._entangledPort.currentTarget = source;
      ports[i]._entangledPort.destinationUrl = targetOrigin;
    }
  };

  window.MessageChannel = MessageChannel;
  window.MessagePort = MessagePort;
}).call(this);
