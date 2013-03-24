if( !window.EventTarget ) {
  function EventTarget(){
    this._listeners = {};
    this.addEventListener = function(type, listener){
        if (typeof this._listeners[type] == "undefined"){
            this._listeners[type] = [];
        }

        this._listeners[type].push(listener);
    };

    this.dispatchEvent = function(event){
        if (typeof event == "string"){
            event = { type: event };
        }
        if (!event.target){
            event.target = this;
        }

        if (!event.type){  //falsy
            throw new Error("Event object missing 'type' property.");
        }

        if (this._listeners[event.type] instanceof Array){
            var listeners = this._listeners[event.type];
            for (var i=0, len=listeners.length; i < len; i++){
                listeners[i].call(this, event);
            }
        }
    };

    this.removeEventListener = function(type, listener){
        if (this._listeners[type] instanceof Array){
            var listeners = this._listeners[type];
            for (var i=0, len=listeners.length; i < len; i++){
                if (listeners[i] === listener){
                    listeners.splice(i, 1);
                    break;
                }
            }
        }
    };
  }
}

if( !window.MessageEvent ) {
  function MessageEvent () {
    Event.apply(this, 'message');
  };
}

(function(root) {
  function disentangle( port1, port2 ) {
    console.log('Disentangle ports!');
  };

  function MessagePort () {
    EventTarget.apply(this, arguments);
    this._entangledPort = null;
    this.messageQueue = [];

    this.start = function() {
    };

    this.close = function() {
      disentangle( this, this._entangledPort );
    };

    this.postMessage = function(data) {
      // 1- Let target port be the port with which source port is entangled, if any
      var target = this._entangledPort,
      // 2- Let new ports be an empty array
          newPorts = [],
      // 5- Let message clone be the result of obtaining a structured clone of the message argument
          // /!\ Need to clone
          messageClone = data;

      // 8- If there is no target port (i.e. if source port is not entangled), then abort these steps.
      if(!target) {
        return;
      }

      // 9- Create an event that uses the MessageEvent interface, with the name message
      var event = new MessageEvent;
      // 10- Let the data attribute of the event be initialized to the value of message clone.
      event.data = messageClone;
      // 11- Let the ports attribute of the event be initialized to the new ports array.
      event.ports = newPorts;
      // 12- Add the event to the port message queue of target port.
      target.messageQueue.push( event );
    };
  };

  function MessageChannel () {
    // /!\ Ports should be owned by window/owner
    var port1 = new MessagePort(),
        port2 = new MessagePort(),
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

  // if (typeof exports !== 'undefined') {
    // if (typeof module !== 'undefined' && module.exports) {
      // exports = module.exports = MessageChannel;
    // }
    // exports.MessageChannel = MessageChannel;
  // } else {
    // root['MessageChannel'] = MessageChannel;
  // }
  window.MessageChannel = MessageChannel;
}).call(this);
