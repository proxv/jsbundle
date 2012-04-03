var moduleHandler = require('module');
var crypto = require('crypto');
var path = require('path');
var fs = require('fs');
var parser = require('uglify-js').parser;
var uglify = require('uglify-js').uglify;
var _ = require('underscore');
var template = require('./template');

function Module(filename, options) {
  this._filename = path.resolve(filename);
  this._options = options || {};
  this._extraDependencies = [];
  this._extraRequires = this._compileExtraRequires(this._options.extraRequires);
  this._lineDelta = 0;
  this._load();
}

Module.prototype = {
  _representationForModuleHandler: function() {
    return {
      filename: this._filename,
      id: this._filename,
      paths: moduleHandler._nodeModulePaths(path.dirname(this._filename))
    };
  },

  _resolve: function(requiredValue) {
    var resolved = moduleHandler._resolveFilename(requiredValue, this._representationForModuleHandler());
    return _(resolved).isArray() ? resolved[1] : resolved;
  },

  _errorMessageWithContext: function(message, src, lineNumber) {
    var context = '';
    if (src && lineNumber) {
      context = ':\n\n        ' + src.split(/\n|\r\n/)[lineNumber - 1];
    }
    return message + context + '\n\n    at ' + this._filename + (lineNumber ? ':' + (lineNumber - this._lineDelta) : '');
  },

  _parse: function(src) {
    try {
      return parser.parse(src, false, true);
    } catch (e) {
      throw new Error(this._errorMessageWithContext(e.message, src, e.line));
    }
  },

  _compileExtraRequires: function(extraRequires) {
    var compiledRequires = [];
    _(extraRequires).each(function (value, key) {
      try {
        value = this._resolve(value);
      } catch (e) {
        throw new Error(this._errorMessageWithContext(e.message + ', added via extraRequires'));
      }
      this._extraDependencies.push(value);
      compiledRequires.push('var ' + key + ' = require(' + JSON.stringify(value) + ');');
    }, this);
    return compiledRequires.join('\n');
  },

  _findRequireCalls: function(src) {
    var itself = this;
    var walker = uglify.ast_walker();
    var requireCalls = [];

    walker.with_walkers({
      'call': function() {
        if (uglify.gen_code(this[1]) === 'require') {
          var paramToken = this[2][0][0];
          if (paramToken.start.type === 'string') {
            var resolvedName;

            try {
              resolvedName = itself._resolve(paramToken.start.value);
            } catch (e) {
              throw new Error(itself._errorMessageWithContext(e.message, src, this[0].start.line + 1));
            }

            if (resolvedName.charAt(0) !== '/') {
              throw new Error(itself._errorMessageWithContext("can't handle native module require", src, this[0].start && (this[0].start.line + 1)));
            }

            requireCalls.push({ token: paramToken, resolvedName: resolvedName });
          } else {
            throw new Error(itself._errorMessageWithContext("can't handle non-const require", src, this[0].start && (this[0].start.line + 1)));
          }
        }
      }
    }, function() {
      return walker.walk(itself._parse(src));
    });

    return requireCalls;
  },

  _load: function() {
    try {
      var src = fs.readFileSync(this._filename, 'utf-8');
    } catch (e) {
      throw new Error('cannot read file: ' + this._filename);
    }

    // strip shebang
    src = src.replace(/^\s*#![^\n]*/, '');

    // turn JSON files into valid CommonJS modules
    if (path.extname(this._filename) === '.json') {
      src = 'module.exports = ' + src + ';';
    }

    this._rawSrc = src;
    this._wrappedSrc = null;
    this._id = null;
  },

  _applyFilters: function(src) {
    _(this._options.filters).each(function(filter) {
      src = filter.run(src);
      if (typeof src !== 'string') {
        throw new Error('output filter did not return string:\n' + filter);
      }
      if (typeof filter.lineDelta === 'number') {
        this._lineDelta += filter.lineDelta;
      }
    }, this);

    return src;
  },

  dependencies: function() {
    var dependencySet = {};
    _(this._findRequireCalls(this._rawSrc)).each(function(requireCall) {
      dependencySet[requireCall.resolvedName] = true;
    });

    return _(dependencySet).keys();
  },

  extraDependencies: function() {
    return this._extraDependencies;
  },

  _wrapModule: function(ignoreExtraRequires) {
    var templateData = {
      filename: this._filename
    };

    if (ignoreExtraRequires) {
      templateData.extraRequires = '';
      templateData.body = this._rawSrc;
    } else {
      templateData.extraRequires = this._extraRequires;
      templateData.body = this._applyFilters(this._rawSrc);
    }

    this._wrappedSrc = template.compile('module-wrapper', templateData);
  },

  updateRequires: function(idMap, ignoreExtraRequires) {
    this._wrapModule(ignoreExtraRequires);

    var replacementOffset = 0;

    _(this._findRequireCalls(this._wrappedSrc)).each(function(requireCall) {
      var token = requireCall.token;
      // look up id if an idMap was passed in, else use the resolvedName
      var id = JSON.stringify(idMap ? idMap[requireCall.resolvedName] : requireCall.resolvedName);
      var startPos = token.start.pos + replacementOffset;
      var endPos = token.end.endpos + replacementOffset;
      this._wrappedSrc = this._wrappedSrc.substring(0, startPos) +
                         id +
                         this._wrappedSrc.substring(endPos);
      replacementOffset += id.length - (endPos - startPos);
    }, this);
  },

  compileWithId: function(id) {
    return template.compile('module-prefix', { id: JSON.stringify(id), moduleDef: this._wrappedSrc });
  },

  sha1: function() {
    var hash = crypto.createHash('sha1');
    return hash.update(this._rawSrc, 'utf-8').digest('hex');
  },

  filename: function() {
    return this._filename;
  }
};

module.exports = Module;

