var parser = require('uglify-js').parser;
var uglify = require('uglify-js').uglify;
var _ = require('underscore');

var LOG_LEVELS = {
  'off': 0,
  'error': 1,
  'warn': 2,
  'info': 3,
  'debug': 4,
  'trace': 5
};

function init(options) {
  var logLevel = options.loggerFilterLevel;
  if (typeof logLevel !== 'string' || typeof LOG_LEVELS[logLevel] === 'undefined') {
    throw new Error('invalid log level: ' + logLevel);
  }

  var allowedLogLevelsSet = {};

  _(LOG_LEVELS).each(function(rank, name) {
    if (rank > 0 && rank <= LOG_LEVELS[logLevel]) {
      allowedLogLevelsSet[name] = true;
    }
  });

  function loggerFilter(src) {
    var replacementOffset = 0;
    var walker = uglify.ast_walker();

    walker.with_walkers({
      'call': function() {
        if (this[1][0] === 'dot' &&
                   this[1][1][0] === 'name' &&
                   this[1][1][1] === 'logger') {
          var logLevel = this[1][2];
          if (allowedLogLevelsSet[logLevel] !== true) {
            var token = this[0];
            var startPos = token.start.pos + replacementOffset;
            var endPos = token.end.endpos + replacementOffset;
            src = src.substring(0, startPos) + '/* ' +
                  src.substring(startPos, endPos) + ' */' +
                  src.substring(endPos);
            replacementOffset += '/*  */'.length;
          }
        }
      }
    }, function() {
      return walker.walk(parser.parse(src, false, true));
    });

    return src;
  }

  return loggerFilter;
}

exports.init = init;

