var isInternetExplorer = (navigator.appName === 'Microsoft Internet Explorer');

function UrlLogger(url) {
  this._url = url || '';
  this.error = this.log;
  this.warn = this.log;
  this.info = this.log;
  this.debug = this.log;
  this.trace = this.log;
  this.log = void 0;
}

UrlLogger.prototype = {
  log: function() {
    var args = Array.prototype.slice.call(arguments);
    for (var i = 0, len = args.length; i < len; i++) {
      var arg = args[i];
      if (arg instanceof Error) {
        if (arg.stack) {
          if (isInternetExplorer) { // avoid hitting URL length limits in IE
            args[i] = arg.stack.split(/\s*\n\s*/)[1];
          } else {
            args[i] = arg.stack;
          }
        } else {
          args[i] = arg.message;
        }
      }
    }

    this._sendData(args);
  },

  _sendData: function(data) {
    if (typeof document !== 'undefined' &&
        document.createElement &&
          document.documentElement) { // don't try to send data if we don't have a DOM
      var body = document.body || document.documentElement;

      var img = document.createElement('img');
      img.onload = img.onerror = function() {
        body.removeChild(img);
        img = null;
      };
      img.src = this._url + encodeURIComponent(JSON.stringify(data));

      body.appendChild(img);
    }
  }
}

function ConsoleLogger() {
  if (this.log) {
    this.trace = this.log;
    this.log = void 0;
  }
}

// ugly hack because IE doesn't support console.log.apply
function getConsoleLogFunction(name) {
  return function(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    if (typeof console !== 'undefined') {
      switch (arguments.length) {
        case 0:
          console[name]();
          break;
        case 1:
          console[name](arg0);
          break;
        case 2:
          console[name](arg0, arg1);
          break;
        case 3:
          console[name](arg0, arg1, arg2);
          break
        case 4:
          console[name](arg0, arg1, arg2, arg3);
          break;
        case 5:
          console[name](arg0, arg1, arg2, arg3, arg4);
          break;
        case 6:
          console[name](arg0, arg1, arg2, arg3, arg4, arg5);
          break;
        case 7:
          console[name](arg0, arg1, arg2, arg3, arg4, arg5, arg6);
          break;
        case 7:
          console[name](arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7);
          break;
        case 8:
          console[name](arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8);
          break;
        case 9:
          console[name](arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9);
          break;
        case 10:
          console[name](arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10);
          break;
        default:
          break;
      }
    }
  };
}


try {
  ConsoleLogger.prototype = console;
  (new ConsoleLogger).groupEnd(); // feature detection for ability to use the console object as a prototype
} catch (e) {
  ConsoleLogger.prototype = {
    error: getConsoleLogFunction('error'),
    warn:  getConsoleLogFunction('warn'),
    info:  getConsoleLogFunction('info'),
    debug: getConsoleLogFunction('log'),
    trace: getConsoleLogFunction('log')
  };
}

function getLogger(type) {
  switch (type && type.toLowerCase()) {
    case 'console':
      return ConsoleLogger;
    case 'url':
      return UrlLogger;
    default:
      throw new Error('unknown logger type: ' + type);
  }
}

module.exports = getLogger;

