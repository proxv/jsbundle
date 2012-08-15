function Logger() {
  if (this.log) {
    this.trace = this.log;
    this.log = void 0;
  }
}

if (typeof console !== 'undefined' && typeof console.log === 'function') {
  Logger.prototype = console;
} else { // for the dreaded IE, which doesn't allow console.log.apply
  function getLogFunction(name) {
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

  Logger.prototype = {
    error: getLogFunction('error'),
    warn: getLogFunction('warn'),
    info: getLogFunction('info'),
    debug: getLogFunction('debug'),
    trace: getLogFunction('log')
  };
}

module.exports = Logger;

