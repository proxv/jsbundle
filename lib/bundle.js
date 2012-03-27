var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var template = require('./template');
var Module = require('./module');

function _expandExtraRequires(extraRequires, relativeToDir) {
  var expandedRequires = {};
  _(extraRequires).each(function (value, key) {
    if (typeof value === 'string' && /^\.\/|^\.\./.test(value)) {
      value = path.resolve(relativeToDir, value);
    }
    expandedRequires[key] = value;
  });
  return expandedRequires;
}

function _compileStatementArray(statementArray) {
  var compiledStatements = [];
  _(statementArray).each(function (value) {
    compiledStatements.push(/;\s*$/.test(value) ? value : value + ';');
  });
  return compiledStatements.join('\n');
}

function _buildModuleOptions(options, relativeToDir) {
  var moduleOptions = {};

  moduleOptions.extraRequires = _expandExtraRequires(options.extraRequires, relativeToDir);
  moduleOptions.beforeModuleBody = _compileStatementArray(options.beforeModuleBody);
  moduleOptions.afterModuleBody = _compileStatementArray(options.afterModuleBody);

  return moduleOptions;
}

function _initOutputFilters(options, relativeToDir) {
  var outputFilters = [];
  _(options.outputFilters).each(function(outputFilterPath) {
    outputFilterPath = path.resolve(relativeToDir, outputFilterPath);
    var outputFilter = require(outputFilterPath).init(options);
    outputFilters.push(outputFilter);
  });
  return outputFilters;
}

function bundle(entryFile, configFile) {
  entryFile = path.resolve(entryFile);

  var configDir;
  var options = {};
  var counter = 0;
  var files = [ entryFile ];

  var modules = {};
  var moduleHashToIdMap = {};
  var moduleFileToIdMap = {};

  // for ensuring that extra requires don't also require themselves
  var userRequiredFiles = {};
  userRequiredFiles[entryFile] = true;
  var userRequiredModuleIds = {};

  if (configFile) {
    options = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
    configDir = path.dirname(configFile);
  }
  var moduleOptions = _buildModuleOptions(options, configDir);
  moduleOptions.outputFilters = _initOutputFilters(options, configDir);

  while (files.length > 0) {
    var file = path.resolve(files.shift());
    var id = moduleFileToIdMap[file];
    if (!id) { // We haven't seen this file before.
      var mod = new Module(file, moduleOptions);

      // Ignore duplicates, i.e. identical files with different paths.
      // This comes up a lot because of how npm copies modules everywhere and
      // would be very wasteful when served over the network.
      var hash = mod.sha1();
      id = moduleHashToIdMap[hash];
      if (!id) { // This module is not a duplicate.
        id = moduleHashToIdMap[hash] = (options.mangleNames ? counter++ : file);
        modules[id] = mod;
        var deps = mod.dependencies();

        // Mark user-required dependencies of user-required files as also being user-required.
        if (userRequiredFiles[file]) {
          _(deps).each(function(dep) {
            userRequiredFiles[dep] = true;
          });
        }

        files = files.concat(mod.extraDependencies().concat(deps));
      }

      moduleFileToIdMap[file] = id;

      if (userRequiredFiles[file]) {
        userRequiredModuleIds[id] = true;
      }
    }
  }

  var moduleDefs = [];
  _(modules).each(function(module, id) {
    module.updateRequires(moduleFileToIdMap, !userRequiredModuleIds[id]);
    moduleDefs.push(module.compileWithId(id));
  });

  var src = template.compile('bundle', {
    moduleDefs: moduleDefs.join('\n\n'),
    mainModuleId: JSON.stringify(moduleFileToIdMap[path.resolve(entryFile)])
  });

  return {
    src: src,
    modules: modules
  };
}

module.exports = bundle;

