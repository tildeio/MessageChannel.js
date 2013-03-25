window.messagePorts = {};
(function(root) {
  function MessagePort( uuid ) {
    this._entangledPort = null;
    this.currentTarget = null;
    this.destinationUrl = null;
    this._listeners = [],
    this._events = [],
    this._openedPort = false,

    this.uuid = uuid || UUID.generate();
    window.messagePorts[this.uuid] = this;
  };

  MessagePort.prototype = {
    start: function() {
      var event;
      while( event = this._events.shift() ) {
        this.dispatchEvent( event );
      }
      this._openedPort = true;
    },

    postMessage: function(data) {
      // 1- Let target port be the port with which source port is entangled, if any
      var target = this._entangledPort,
      // 5- Let message clone be the result of obtaining a structured clone of the message argument
          messageClone = Kamino.stringify({target: target.uuid, data: data});

      // 8- If there is no target port (i.e. if source port is not entangled), then abort these steps.
      if(!target) {
        return;
      }

      // 12- Add the event to the port message queue of target port.
      this.currentTarget.postMessage(messageClone, this.destinationUrl);
    },

    getPort: function( portClone, messageEvent ) {
      var loadPort = function(uuid) {
        var port = window.messagePorts[uuid] || newObject(MessagePort, uuid);
        return port;
      }

      var port = loadPort(portClone.uuid);
      port._entangledPort = loadPort( portClone._entangledPort.uuid );
      port._entangledPort._entangledPort = port;
      port.currentTarget = messageEvent.source;
      port.destinationUrl = messageEvent.origin;

      return port;
    },

    addEventListener: function( func ) {
      this._listeners.push( func );
    },

    dispatchEvent: function( data ) {
      var listeners = this._listeners;
      for (var i=0, len=listeners.length; i < len; i++){
        listeners[i].call(this, data);
      }
    },

    enqueueEvent: function( data ) {
      if(this._openedPort) {
        this.dispatchEvent( data );
      } else {
        this._events.push( data );
      }
    }
  };

  function newObject(func) {
   // get an Array of all the arguments except the first one
    var args = Array.prototype.slice.call(arguments, 1);

    // create a new object with its prototype assigned to func.prototype
    var object = Object.create(func.prototype);

    // invoke the constructor, passing the new object as 'this'
    // and the rest of the arguments as the arguments
    func.apply(object, args);

    // return the new object
    return object;
  };


  function MessageChannel () {
    // /!\ Ports should be owned by window/owner
    var port1 = newObject(MessagePort),
        port2 = newObject(MessagePort),
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

  window.MessageChannel = MessageChannel;
  window.MessagePort = MessagePort;
}).call(this);
