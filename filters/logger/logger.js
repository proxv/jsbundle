function RollbarLogger() {
  this.warn = this.warning;
}
RollbarLogger.prototype = window.Rollbar;

function getLogger(type) {
  switch (type && type.toLowerCase()) {
    case 'console':
      return console;
    case 'rollbar':
      return (typeof Rollbar === 'object' ? new RollbarLogger() : console);
    default:
      throw new Error('unknown logger type: ' + type);
  }
}

module.exports = getLogger;
