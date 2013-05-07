(function(root) {
  var self = this,
      usePoly = false,
      a_slice = [].slice;

  if( usePoly || !self.MessageChannel ) {

    var isWindowToWindowMessage = function( currentTarget ) {
          return typeof window !== "undefined" && self instanceof Window && !( currentTarget instanceof Worker );
        },
        log = function( message ) {
          if (MessageChannel.verbose) {
            var args = a_slice.apply(arguments);
            args.unshift("MCNP: ");
            console.log.apply(console, args);
          }
        },
        messagePorts = {};

    MessagePort = function( uuid ) {
      this._entangledPortUuid = null;
      this.destinationUrl = null;
      this._listeners = {};
      this._messageQueue = [],
      this._messageQueueEnabled = false,
      this._currentTarget = null;

      this.uuid = uuid || UUID.generate();
      messagePorts[this.uuid] = this;
      this.log("created");
    };

    MessagePort.prototype = {
      start: function() {
        var event,
            self = this;

        // TODO: we have no guarantee that
        // we will not receive and process events in the correct order
        setTimeout( function() {
          self.log('draining ' + self._messageQueue.length + ' queued messages');
          while( (event = self._messageQueue.shift()) ) {
            self.dispatchEvent( event );
          }
        });
        this._messageQueueEnabled = true;
        this.log('started');
      },

      close: function() {
        this._messageQueueEnabled = false;
        if( this._entangledPortUuid ) {
          this._getEntangledPort()._entangledPortUuid = null;
          this._entangledPortUuid = null;

          // /!\ Probably need to send that (?)
        }
      },

      postMessage: function( message ) {
        // Numbers refer to step from the W3C specs. It shows how simplified things are
        // 1- Let target port be the port with which source port is entangled, if any
        var target = this._getEntangledPort(),
            currentTarget = this._currentTarget,
            messageClone;


        // 5- Let message clone be the result of obtaining a structured clone of the message argument
        messageClone = MessageChannel.encodeEvent( message, [target], true );

        // 8- If there is no target port (i.e. if source port is not entangled), then abort these steps.
        if(!target) {
          this.log("not entangled, discarding message", message);
          return;
        }

        // 12- Add the event to the port message queue of target port.
        // As the port is cloned when sent to the other user agent,
        // posting a message can mean different things:
        // * The port is still local, then we need to queue the event
        // * the port has been sent, then we need to send that event
        if( currentTarget ) {
          if( isWindowToWindowMessage( currentTarget ) ) {
            this.log("posting message from window to window", message, this.destinationUrl);
            currentTarget.postMessage(messageClone, this.destinationUrl);
          } else {
            this.log("posting message from or to worker", message);
            currentTarget.postMessage(messageClone);
          }
        } else {
          this.log("not connected, queueing message", message);
          target._messageQueue.push( messageClone );
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

      dispatchEvent: function( event ) {
        var listeners = this._listeners.message;
        if( listeners ) {
          for (var i=0, len=listeners.length; i < len; i++){
            listeners[i].call(this, event);
          }
        }
      },

      _enqueueEvent: function( event ) {
        if(this._messageQueueEnabled) {
          this.dispatchEvent( event );
        } else {
          this._messageQueue.push( event );
        }
      },

      _getPort: function( portClone, messageEvent ) {
        var loadPort = function(uuid) {
          var port = messagePorts[uuid] || MessageChannel._createPort(uuid);
          return port;
        };

        var port = loadPort(portClone.uuid);
        port._entangledPortUuid = portClone._entangledPortUuid;
        port._getEntangledPort()._entangledPortUuid = port.uuid;
        port._currentTarget =  messageEvent.source || messageEvent.currentTarget || self;
        if( messageEvent.origin === "null" ) {
          port.destinationUrl = "*";
        } else {
          port.destinationUrl = messageEvent.origin;
        }

        for( var i=0 ; i < portClone._messageQueue.length ; i++ ) {
          port._messageQueue.push( Kamino.parse( portClone._messageQueue[i] ).event );
        }

        return port;
      },

      _getEntangledPort: function() {
        if( this._entangledPortUuid ) {
          return messagePorts[ this._entangledPortUuid ] || MessageChannel._createPort(this._entangledPortUuid);
        } else {
          return null;
        }
      },

      log: function () {
        if (MessageChannel.verbose) {
          var args = a_slice.apply(arguments);
          args.unshift("Port", this.uuid);
          log.apply(null, args);
        }
      }
    };

    MessageChannel = function () {
      var port1 = MessageChannel._createPort(),
          port2 = MessageChannel._createPort(),
          channel;

      port1._entangledPortUuid = port2.uuid;
      port2._entangledPortUuid = port1.uuid;

      channel = {
        port1: port1,
        port2: port2
      };

      MessageChannel.log(channel, "created");

      return channel;
    };

    MessageChannel.log = function (_channel) {
      if (MessageChannel.verbose) {
        var args = ["Chnl"],
            msgArgs = a_slice.call(arguments, 1);

        if (_channel.port1 && _channel.port2) {
          args.push(_channel.port1.uuid, _channel.port2.uuid);
        } else {
          _channel.forEach( function(channel) {
            args.push(channel._entangledPortUuid);
          });
        }

        args.push.apply(args, msgArgs);
        log.apply(null, args);
      }
    };

    MessageChannel._createPort = function() {
      var args = arguments,
          MessagePortConstructor = function() {
            return MessagePort.apply(this, args);
          };

      MessagePortConstructor.prototype = MessagePort.prototype;

      return new MessagePortConstructor();
    };

    /**
        Encode the event to be sent.

        messageEvent.data contains a fake Event encoded with Kamino.js

        It contains:
        * data: the content that the MessagePort should send
        * ports: The targeted MessagePorts.
        * messageChannel: this allows to decide if the MessageEvent was meant for the window or the port

        @param {Object} data
        @param {Array} ports
        @param {Boolean} messageChannel
        @returns {String} a string representation of the data to be sent
    */
    MessageChannel.encodeEvent = function( data, ports, messageChannel ) {
      var currentTargets,
          port, index,
          encodedMessage;

      if( ports && ports.length ) {
        currentTargets = [];

        for(index=0 ; index < ports.length ; index++) {
          port = ports[index];

          if( port ) {
            currentTargets[index] = port._currentTarget;
            delete port._currentTarget;
          }
        }
      }

      encodedMessage = Kamino.stringify( {event: {data: data, ports: ports, messageChannel: messageChannel}} );

      if (currentTargets) {
        for(index=0 ; index < currentTargets.length ; index++) {
          if( currentTargets[index] ) {
            ports[index]._currentTarget = currentTargets[index];
          }
        }
      }

      return encodedMessage;
    };

    /**
        Extract the event from the message.

        messageEvent.data contains a fake Event encoded with Kamino.js

        It contains:
        * data: the content that the MessagePort should use
        * ports: The targeted MessagePorts.
        * messageChannel: this allows to decide if the MessageEvent was meant for the window or the port

        @param {MessageEvent} messageEvent
        @returns {Object} an object that fakes an event with limited attributes ( data, ports )
    */
    MessageChannel.decodeEvent = function( messageEvent ) {
      var fakeEvent = {
            data: null,
            ports: []
          },
          data = Kamino.parse( messageEvent.data ),
          event = data.event,
          ports = event.ports;

      if( event ) {
        if( ports ) {
          for(var i=0; i< ports.length ; i++) {
            fakeEvent.ports.push( MessagePort.prototype._getPort( ports[i], messageEvent ) );
          }
        }
        fakeEvent.data = event.data;
        fakeEvent.messageChannel = event.messageChannel;
      }

      return fakeEvent;
    };

    var _overrideMessageEventListener = function( target ) {
      var targetAddEventListener = target.addEventListener,
          targetRemoveEventListener = target.removeEventListener,
          messageHandler;

      target.addEventListener = function() {
        var self = this;

        if( arguments[0] === 'message' ) {
          var args = Array.prototype.slice.call( arguments ),
              eventListener,
              originalHandler = args[1];

          messageHandler = function( event ) {
            var messageEvent = MessageChannel.decodeEvent( event );

            if( messageEvent.messageChannel ) {
              MessageChannel.propagateEvent( messageEvent );
            } else {
              originalHandler.call( self, messageEvent );
            }
          };

          args[1] = messageHandler;
          targetAddEventListener.apply( self, args );
        } else {
          targetAddEventListener.apply( self, arguments );
        }
      };

      target.removeEventListener = function() {
        var self = this;

        if( arguments[0] === 'message' ) {
          var args = Array.prototype.slice.call( arguments );

          args[1] = messageHandler;
          targetRemoveEventListener.apply( self, args );
        } else {
          targetRemoveEventListener.apply( self, arguments );
        }
      };
    };


    /**
        Send the event to the targeted ports

        It uses the `messageChannel` attribute to decide
        if the event is meant for the window or MessagePorts

        @param {Object} fakeEvent
    */
    MessageChannel.propagateEvent = function( fakeEvent ) {
      var ports, port, entangledPort;

      if( fakeEvent.messageChannel ) {
        ports = fakeEvent.ports;

        for( var i=0 ; i<ports.length ; i++) {
          port = ports[i];
          entangledPort = port._getEntangledPort();

          if( port._currentTarget && entangledPort._currentTarget ) {
            entangledPort.postMessage( fakeEvent.data );
          } else {
            port._enqueueEvent( fakeEvent );
          }
        }
      }
    };

    MessageChannel.reset = function() {
      messagePorts = {};
    };

    /**
        Send the MessagePorts to the other window

        `window.postMessage` doesn't accept fake ports so we have to encode them
        and pass them in the message.

        @param {Object} otherWindow: A reference to another window.
        @param {Object} message: Data to be sent to the other window.
        @param {String} targetOrigin: Specifies what the origin of otherWindow must be for the event to be dispatched.
        @param {Array} ports: MessagePorts that need to be sent to otherWindow.
    */
    if( self.Window ) {
      Window.postMessage = function( otherWindow, message, targetOrigin, ports ) {
        var data, entangledPort;

        data = MessageChannel.encodeEvent( message, ports, false );

        MessageChannel.log(ports, "handshake window", otherWindow);
        otherWindow.postMessage(data, targetOrigin);

        if( ports ) {
          // We need to know if a port has been sent to another user agent
          // to decide when to queue and when to send messages
          // See `MessageChannel.propagateEvent`
          for( var i=0 ; i<ports.length ; i++) {
            entangledPort = ports[i]._getEntangledPort();
            if( !entangledPort._currentTarget ) {
              entangledPort._currentTarget = otherWindow;
              entangledPort.destinationUrl = targetOrigin;
            }
          }
        }
      };

      _overrideMessageEventListener( Window.prototype );
    } else {
      //Worker
      _overrideMessageEventListener( self );
    }

    if( !self.Worker ) {
      self.Worker = {};
    } else {
      _overrideMessageEventListener( Worker.prototype );
    }

    Worker.postMessage = function( worker, message, transferList )  {
      var data = MessageChannel.encodeEvent( message, transferList, false );

      MessageChannel.log(transferList, "handshake worker", worker);
      worker.postMessage( data );

      for( var i=0 ; i<transferList.length ; i++) {
        entangledPort = transferList[i]._getEntangledPort();
        entangledPort._currentTarget = worker;
      }
    };

    self.MessageChannel = MessageChannel;
    self.MessagePort = MessagePort;
  } else {
    self.MessageChannel.propagateEvent = function() {};
    self.MessageChannel.decodeEvent = function( messageEvent ) {
      return messageEvent;
    };

    if( self.Window ) {
      self.Window.postMessage = function( source, message, targetOrigin, ports ) {
        source.postMessage( message, targetOrigin, ports );
      };
    }

    if( self.Worker ) {
      Worker.postMessage = function( worker, message, transferList )  {
        worker.postMessage( message, transferList);
      };
    }
  }
}).call(this);
