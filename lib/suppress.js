// This file implements a workaround for the fact that Node does not expose
// a way to call setMaxListeners() for StatWatcher objects (the objects that
// handle file watching).

var consoleTrace = console.trace;
var consoleError = console.error;

function suppressEventEmitterWarning() {
  console.trace = function() {};
  console.error = function(msg) {
    if (!/warning: possible EventEmitter memory leak detected/.test(msg)) {
      consoleError.apply(this, arguments);
    }
  };
}

function allowEventEmitterWarning() {
  console.trace = consoleTrace;
  console.error = consoleError;
}

exports.suppressEventEmitterWarning = suppressEventEmitterWarning;
exports.allowEventEmitterWarning = allowEventEmitterWarning;

