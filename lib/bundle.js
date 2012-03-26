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
  var moduleFilesWithExtraRequires = {};
  moduleFilesWithExtraRequires[entryFile] = true;
  var moduleIdsWithExtraRequires = {};

  if (configFile) {
    options = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
    configDir = path.dirname(configFile);
  }
  var moduleOptions = _buildModuleOptions(options, configDir);
  moduleOptions.outputFilters = _initOutputFilters(options, configDir);

  while (files.length > 0) {
    var file = path.resolve(files.shift());
    var id = moduleFileToIdMap[file];
    if (!id) {
      var mod = new Module(file, moduleOptions);

      // resolve duplicates: identical files with different paths
      // this comes up a lot because of how npm copies modules everywhere
      var hash = mod.sha1();
      id = moduleHashToIdMap[hash];
      if (!id) {
        id = moduleHashToIdMap[hash] = (options.mangleNames ? counter++ : file);
      }

      modules[id] = mod;
      moduleFileToIdMap[file] = id;

      var deps = mod.dependencies();

      // only "real" dependencies, not "extra" dependencies, get registered
      // as needing extra requires
      if (moduleFilesWithExtraRequires[file] === true) {
        _(deps).each(function(dep) {
          moduleFilesWithExtraRequires[dep] = true;
        });
      }

      files = files.concat(mod.extraDependencies().concat(deps));
    }

    if (moduleFilesWithExtraRequires[file] === true) {
      moduleIdsWithExtraRequires[id] = true;
    }
  }

  var moduleDefs = [];
  _(modules).each(function(module, id) {
    module.updateRequires(moduleFileToIdMap, moduleIdsWithExtraRequires[id] !== true);
    module.setId(id);
    moduleDefs.push(module.compile());
  });

  return template.compile('bundle', {
    moduleDefs: moduleDefs.join('\n\n'),
    mainModuleId: JSON.stringify(moduleFileToIdMap[path.resolve(entryFile)])
  });
}

module.exports = bundle;

