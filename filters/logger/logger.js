var MAX_DATA_LENGTH = 975;

function _validateDataCall(args) {
  if (args.length !== 2) {
    throw new Error('logger.data takes exactly 2 args');
  } else if (typeof args[0] !== 'string' || args[0].length === 0) {
    throw new Error('first param to logger.data must be a non-zero-length namespace string');
  }
}

function UrlLogger(url) {
  if (!url) {
    throw new Error('url required');
  }

  this._url = url;
  this.error = this._log;
  this.warn = this._log;
  this.info = this._log;
  this.debug = this._log;
  this.trace = this._log;
}

UrlLogger.prototype = {
  _send: function(log, type) {
    if (typeof document !== 'undefined' &&
        document.createElement &&
          document.documentElement) { // don't try to send data if we don't have a DOM
      var body = document.body || document.documentElement;

      var img = document.createElement('img');
      img.onload = img.onerror = function() {
        body.removeChild(img);
        img = null;
      };
      var loc = document.location;
      var currentUrl = loc.href.substr(loc.protocol.length + '//'.length + loc.hostname.length);
      img.src = this._url + (this._url.indexOf('?') >= 0 ? '&' : '?') +
                'url=' + encodeURIComponent(currentUrl) +
                'log=' + encodeURIComponent(log) +
                '&type=' + encodeURIComponent(type);

      body.appendChild(img);
    }
  },

  _log: function() {
    var args = Array.prototype.slice.call(arguments);
    var name = JSON.stringify(args.shift().replace(/:\s*$/, ''));
    for (var i = 0, len = args.length; i < len; i++) {
      var arg = args[i];
      if (arg instanceof Error) {
        if (arg.stack) {
          args[i] = arg.stack;
        } else {
          args[i] = arg.message;
        }
      }
    }

    var encoded = JSON.stringify(args);
    while (encoded.length > MAX_DATA_LENGTH) {
      var longestLength = 0;
      var longestIndex = -1;
      for (var i = 0, len = args.length; i < len; i++) {
        var encodedArg = JSON.stringify(args[i]);
        if (encodedArg.length > longestLength) {
          longestLength = encodedArg.length;
          longestIndex = i;
        }
      }

      // try to trim down longest value to make it fit
      var longestArg = args[longestIndex];
      if (typeof longestArg === 'string') {
        longestArg = longestArg.split('\n');
        longestArg = longestArg.slice(0, Math.round(longestArg.length / 2)).join('\n') + '\n(truncated)';
      } else if (typeof longestArg.slice === 'function') {
        longestArg = longestArg.slice(0, Math.round(longestArg.length / 2));
        longestArg.push('(truncated)');
      }

      if (longestArg.length < args[longestIndex].length) {
        args[longestIndex] = longestArg;
      } else {
        args[longestIndex] = '(truncated)';
      }

      encoded = JSON.stringify(args);
    }

    this._send(encoded, name);
  },

  data: function(namespace, data) {
    _validateDataCall(Array.prototype.slice.call(arguments, 1));
    this._log.apply(this, arguments);
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

ConsoleLogger.prototype.data = function() {
  _validateDataCall(Array.prototype.slice.call(arguments, 1));
  this.debug.apply(this, arguments);
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

