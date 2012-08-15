var parser = require('uglify-js').parser;
var uglify = require('uglify-js').uglify;
var _ = require('underscore');

var LOG_LEVELS = {
  'off':   0,
  'error': 1,
  'warn':  2,
  'info':  3,
  'debug': 4,
  'trace': 5
};

function init(options) {
  var logLevel = options.loggerLevel;
  if (typeof logLevel !== 'string' || typeof LOG_LEVELS[logLevel] === 'undefined') {
    throw new Error('invalid log level: ' + logLevel);
  }

  var allowedLogLevelsSet = {};

  _(LOG_LEVELS).each(function(rank, name) {
    if (rank > 0 && rank <= LOG_LEVELS[logLevel]) {
      allowedLogLevelsSet[name] = true;
    }
  });

  var loggerFile = __dirname + '/logger.js';

  return {
    run: function(src) {
      var replacementOffset = 0;
      var walker = uglify.ast_walker();

      walker.with_walkers({
        'call': function() {
          if (this[1][0] === 'dot' &&
                     this[1][1][0] === 'name' &&
                     this[1][1][1] === 'logger') {
            var logLevel = this[1][2];
            var token = this[0];
            var startPos = token.start.pos + replacementOffset;
            var endPos = token.end.endpos + replacementOffset;

            if (allowedLogLevelsSet[logLevel] !== true) {
              src = src.substring(0, startPos) + '/* ' +
                    src.substring(startPos, endPos) + ' */' +
                    src.substring(endPos);
              replacementOffset += '/*  */'.length;
            } else {
              var stringToInject = '"' + logLevel.charAt(0) + '[" + __shortfilename + "]:"';
              if (this[2].length > 0) {
                stringToInject += ', ';
              }
              var logStatement = src.substring(startPos, endPos);
              var logFnRegex = new RegExp('(^\\s*logger\\s*\\.\\s*' + logLevel + '\\s*\\(\s*)');
              logStatement = logStatement.replace(logFnRegex, '$1' + stringToInject);
              src = src.substring(0, startPos) +
                    logStatement +
                    src.substring(endPos);
              replacementOffset += stringToInject.length;
            }
          }
        }
      }, function() {
        return walker.walk(parser.parse(src, false, true));
      });

      if (logLevel === 'off') {
        return src;
      } else {
        return 'var __shortfilename = String(__filename).split("/");\n\
                __shortfilename = __shortfilename.slice(__shortfilename.length - 3).join("/");\n\
                var logger = new (require(' + JSON.stringify(loggerFile) + '));\n' + src;
      }
    },

    requires: logLevel === 'off' ? [] : [ loggerFile ], // must be absolute paths

    lineDelta: logLevel === 'off' ? 0 : 3
  }
}

exports.init = init;

