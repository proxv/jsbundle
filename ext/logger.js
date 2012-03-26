function Logger(name) {
  this._name = name;
}

var logMethods = ['error', 'warn', 'info', 'debug', 'trace'];

for (var index = 0, len = logMethods.length; index < len; ++index) {
  (function(index, funcName) {
    Logger.prototype[funcName] = function() {
      var con = self.console;
      var message = [funcName[0], '[', this._name, ']'].join('');
      var args = Array.prototype.slice.call(arguments);
      var stack_traces = [];

      // logger.trace -> console.log
      funcName = funcName === 'trace' ? 'log' : funcName;

      if (!con) {
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

      if (con.firebug) {
        args.unshift(message);
        con[funcName].apply(self, args);
      } else {
        if (args.length <= 0) {
          con[funcName] ? con[funcName](message) :
            con.log(message);
        } else if (args.length === 1) {
          con[funcName] ? con[funcName](message, args[0]) :
            con.log(message, args[0]);
        } else {
          con[funcName] ? con[funcName](message, args) :
            con.log(message, args);
        }
      }

      var len = stack_traces.length;

      if (len > 0) {
        con.log('Listing exception stack traces individually:');
        for (var i = 0; i < len; ++i) {
          con.log(stack_traces[i]); // why? because in Google Chrome,
                                    // this will make clickable links
        }
      }
    };
  })(index, logMethods[index]);
}

module.exports = Logger;

