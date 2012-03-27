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
    return moduleHandler._resolveFilename(requiredValue, this._representationForModuleHandler())[1];
  },

  _formatParseError: function(message, astNode) {
    var lineNumber = astNode[0] && astNode[0].start && (astNode[0].start.line + 1);
    return message + ': ' + uglify.gen_code(astNode) + ' (' + this._filename + (lineNumber ? ':' + lineNumber : '') + ')';
  },

  _parse: function(src) {
    try {
      return parser.parse(src, false, true);
    } catch (e) {
      var lines = src.split(/\n|\r\n/).slice(e.line - 3, e.line + 3);
      var line = lines.join('\n');
      throw new Error(e.message + ":\n\n" + (line ? line : "") + "\n\n(" + this._filename + ")");
    }
  },

  _compileExtraRequires: function(extraRequires) {
    var itself = this;
    var compiledRequires = [];
    _(extraRequires).each(function (value, key) {
      value = itself._resolve(value);
      itself._extraDependencies.push(value);
      compiledRequires.push('var ' + key + ' = require(' + JSON.stringify(value) + ');');
    });
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
            var resolvedName = itself._resolve(paramToken.start.value);
            if (resolvedName.charAt(0) !== '/') {
              throw new Error(itself._formatParseError("can't handle native module require", this))
            }
            requireCalls.push({ token: paramToken, resolvedName: resolvedName });
          } else {
            throw new Error(itself._formatParseError("can't handle non-const require", this));
          }
        }
      }
    }, function() {
      return walker.walk(itself._parse(src));
    });

    return requireCalls;
  },

  _load: function() {
    this._rawSrc = fs.readFileSync(this._filename, 'utf-8');

    // strip shebang
    this._rawSrc = this._rawSrc.replace(/^\s*#![^\n]*/, '');

    this._moduleDef = null;
    this._id = null;
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

  _wrapModule: function(ignoreOptions) {
    var src = this._rawSrc;

    // turn JSON files into valid CommonJS modules
    if (path.extname(this._filename) === 'json') {
      src = 'module.exports = ' + src + ';';
    }

    var templateData = {};

    if (ignoreOptions) {
      templateData.extraRequires = '';
      templateData.beforeModuleBody = '';
      templateData.afterModuleBody = '';
    } else {
      _(templateData).extend(this._options);
      templateData.extraRequires = this._extraRequires;
    }

    _(templateData).extend({
      body: src,
      filename: this._filename
    });

    this._moduleDef = template.compile('module-wrapper', templateData);
  },

  updateRequires: function(idMap, ignoreOptions) {
    this._wrapModule(ignoreOptions);

    var replacementOffset = 0;
    var itself = this;

    _(this._findRequireCalls(this._moduleDef)).each(function(requireCall) {
      var token = requireCall.token;
      // look up id if an idMap was passed in, else use the resolvedName
      var id = JSON.stringify(idMap ? idMap[requireCall.resolvedName] : requireCall.resolvedName);
      var startPos = token.start.pos + replacementOffset;
      var endPos = token.end.endpos + replacementOffset;
      itself._moduleDef = itself._moduleDef.substring(0, startPos) +
                    id +
                    itself._moduleDef.substring(endPos);
      replacementOffset += id.length - (endPos - startPos);
    });
  },

  compileWithId: function(id) {
    var src = template.compile('module-prefix', { id: JSON.stringify(id), moduleDef: this._moduleDef });

    _(this._options.outputFilters).each(function(filterFn) {
      src = filterFn(src);
      if (typeof src !== 'string') {
        throw new Error('output filter did not return string:\n' + filterFn.toString);
      }
    });

    return src;
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

