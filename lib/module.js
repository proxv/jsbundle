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
  this._id = null;
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

  resolve: function(requiredValue) {
    var resolved = moduleHandler._resolveFilename(requiredValue, this._representationForModuleHandler());
    resolved = _(resolved).isArray() ? resolved[1] : resolved;
    if (this._options.moduleMap) {
      this._options.moduleMap[requiredValue.replace(/.*\/(?=[^\/]+)|\.js$/g, '')] = resolved;
    }
    return resolved;
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
      this.error = new Error(this._errorMessageWithContext(e.message, src, e.line));
      throw this.error;
    }
  },

  _compileExtraRequires: function(extraRequires) {
    var compiledRequires = [];
    _(extraRequires).each(function (value, key) {
      try {
        value = this.resolve(value);
      } catch (e) {
        this.error = new Error(this._errorMessageWithContext(e.message + ', added via extraRequires'));
        throw this.error;
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
              resolvedName = itself.resolve(paramToken.start.value);
            } catch (e) {
              itself.error = new Error(itself._errorMessageWithContext(e.message, src, this[0].start.line + 1));
              throw itself.error;
            }

            if (resolvedName.charAt(0) !== '/') {
              itself.error = new Error(itself._errorMessageWithContext("can't handle native module require", src, this[0].start && (this[0].start.line + 1)));
              throw itself.error;
            }

            requireCalls.push({ token: paramToken, resolvedName: resolvedName });
          } else {
            itself.error = new Error(itself._errorMessageWithContext("can't handle non-const require", src, this[0].start && (this[0].start.line + 1)));
            throw itself.error;
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
      this.error = new Error(e.message + ' cannot read file: ' + this._filename);
      throw this.error;
    }

    // strip shebang
    src = src.replace(/^\s*#![^\n]*/, '');

    // turn JSON files into valid CommonJS modules
    if (path.extname(this._filename) === '.json') {
      src = 'module.exports = ' + src + ';';
    }

    this._dependencies = null;
    this._rawSrc = src;
    this._wrappedSrc = null;
    this._compiledSrc = null;
    this.error = null;
  },

  reload: function() {
    try {
      var oldDeps = this.dependencies();
      this._oldDependencies = oldDeps;
    } catch (e) {
      // ignore syntax errors
    }
    this._load();
    try {
      return _.isEqual(this.dependencies(), this._oldDependencies);
    } catch (e) {
      // ignore syntax errors
      return true;
    }
  },

  _applyFilters: function(src) {
    _(this._options.filters).each(function(filter) {
      src = filter.run(src);
      if (typeof src !== 'string') {
        this.error = new Error('output filter did not return string:\n' + filter);
        throw this.error;
      }
      if (typeof filter.lineDelta === 'number') {
        this._lineDelta += filter.lineDelta;
      }
    }, this);

    return src;
  },

  dependencies: function() {
    if (!this._dependencies) {
      var dependencySet = {};
      _(this._findRequireCalls(this._rawSrc)).each(function(requireCall) {
        dependencySet[requireCall.resolvedName] = true;
      });

      this._dependencies = _(dependencySet).keys().sort();
    }

    return this._dependencies;
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

  filename: function() {
    return this._filename;
  },

  setId: function(id) {
    this._id = this._options.mangleNames ? Number(id) : id;
  },

  id: function() {
    return this._id;
  },

  sha1: function() {
    var hash = crypto.createHash('sha1');
    return hash.update(this._rawSrc, 'utf-8').digest('hex');
  },

  compile: function() {
    if (!this._compiledSrc) {
      this._compiledSrc = template.compile('module-prefix', { id: JSON.stringify(this._id), moduleDef: this._wrappedSrc });
    }

    return this._compiledSrc;
  }
};

module.exports = Module;

