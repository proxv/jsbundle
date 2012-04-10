function Logger(name) {
  var nameParts = String(name).split('/');
  this._name = nameParts.slice(nameParts.length - 3).join('/');
}

var logMethods = ['error', 'warn', 'info', 'debug', 'trace'];

for (var index = 0, len = logMethods.length; index < len; ++index) {
  (function(index, funcName) {
    Logger.prototype[funcName] = function() {
      var message = [funcName[0], '[', this._name, ']'].join('');
      var args = Array.prototype.slice.call(arguments);
      var stack_traces = [];

      // logger.trace -> console.log
      funcName = funcName === 'trace' ? 'log' : funcName;

      if (!console) {
        return;
      }

      if (typeof args[0] === 'string') {
        message += ': ' + args.shift();
      }

      for (var i = 0, len = args.length; i < len; ++i) {
        if (args[i] && args[i].stack) {
          stack_traces.push(args[i].stack);
        }
      }

      if (console.firebug) {
        args.unshift(message);
        console[funcName].apply(self, args);
      } else {
        if (args.length <= 0) {
          console[funcName] ? console[funcName](message) :
            console.log(message);
        } else if (args.length === 1) {
          console[funcName] ? console[funcName](message, args[0]) :
            console.log(message, args[0]);
        } else {
          console[funcName] ? console[funcName](message, args) :
            console.log(message, args);
        }
      }

      var len = stack_traces.length;

      if (len > 0) {
        console.log('Listing exception stack traces individually:');
        for (var i = 0; i < len; ++i) {
          console.log(stack_traces[i]); // why? because in Google Chrome,
                                    // this will make clickable links
        }
      }
    };
  })(index, logMethods[index]);
}

module.exports = Logger;

