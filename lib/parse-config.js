var fs = require('fs');
var path = require('path');
var _ = require('underscore');

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

function _initOutputFilters(options, relativeToDir) {
  var outputFilters = [];
  _(options.outputFilters).each(function(outputFilterPath) {
    outputFilterPath = path.resolve(relativeToDir, outputFilterPath);
    var outputFilter = require(outputFilterPath).init(options);
    outputFilters.push(outputFilter);
  });
  return outputFilters;
}

function _readConfigFile(configFile) {
  var rawConfig = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
  var config = rawConfig['default'];

  var env = process.env.JSBUNDLE_ENV;
  if (env) {
    console.error('Using JSBUNDLE_ENV "' + env + '".');
    _(config).extend(rawConfig[env]);
  } else {
    console.error('No JSBUNDLE_ENV specified. Using default configuration.');
  }

  return config;
}

function parseConfig(configFile) {
  var configDir = path.dirname(configFile);
  var config = {};

  var pathsToTry = [ configFile, 'jsbundle.json' ];

  for (var i = 0, len = pathsToTry.length; i < len; i++) {
    configFile = pathsToTry[i];
    try {
      fs.statSync(configFile);
      break;
    } catch (e) {
      configFile = null;
    }
  }

  if (configFile) {
    console.error('Using config file: "' + configFile + '".');
    config = _readConfigFile(configFile);
  } else {
    console.error('No config file found.');
  }

  config.extraRequires = _expandExtraRequires(config.extraRequires, configDir);
  config.beforeModuleBody = _compileStatementArray(config.beforeModuleBody);
  config.afterModuleBody = _compileStatementArray(config.afterModuleBody);
  config.beforeBundle = _compileStatementArray(config.beforeBundle);
  config.afterBundle = _compileStatementArray(config.afterBundle);
  config.outputFilters = _initOutputFilters(config, configDir);
  config.bundleUrl = config.bundleUrl || '';

  return config;
}

module.exports = parseConfig;

