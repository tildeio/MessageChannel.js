QUnit.module("MessageChannel");

asyncTest("A message can be sent through a port and delivered to its entangled port", 1, function () {
  var mc = new MessageChannel();
  mc.port2.addEventListener('message', function(event) {
    equal("test", event.data, "We receive the correct message");
    start();
  }, false);
  mc.port2.start();
  mc.port1.postMessage('test');
});

asyncTest("Messages are buffered as long as the port receiving port isn't opened", 1, function () {
  var mc = new MessageChannel();
  mc.port2.addEventListener('message', function(event) {
    if(event.data === "") {
    } else {
      equal("a message", event.data, "We receive the correct message");
    }
    start();
  }, false);
  mc.port1.postMessage('a message');
  mc.port1.postMessage('a message');
  mc.port2.start();
  //This is sad
  mc.port1.postMessage('a message');
});


