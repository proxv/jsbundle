var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var Module = require('./module');

function _expandExtraRequires(extraRequires, configFile) {
  var expandedRequires = {};
  _(extraRequires).each(function (value, key) {
    var mod = new Module(configFile);
    expandedRequires[key] = mod.resolve(value);
  });
  return expandedRequires;
}

function _initFilters(options, relativeToDir) {
  var filters = [];
  _(options.filters).each(function(filterPath) {
    var resolvedPath;
    if (filterPath.charAt(0) === '.') {
      resolvedPath = path.resolve(relativeToDir, filterPath);
    } else {
      resolvedPath = path.resolve(__dirname + '/../filters', filterPath);
    }

    filters.push(require(resolvedPath).init(options));
  });
  return filters;
}

function _readConfigFile(configFile, env) {
  var configJson = fs.readFileSync(configFile, 'utf-8').replace(/#[^\n]*/g, '');
  var rawConfig = JSON.parse(configJson);

  var config = rawConfig['defaults'];
  if (!config) {
    throw new Error('no "defaults" defined in config file: "' + configFile + '"');
  }

  if (env) {
    if (env === 'defaults') {
      throw new Error('invalid jsbundle env: ' + env);
    } else if (env && !rawConfig[env]) {
      throw new Error('jsbundle env set to: ' + env + ', but no config for env in file: ' + configFile);
    } else {
      console.error('Using jsbundle env: ' + env);
      _(config).extend(rawConfig[env]);
    }
  } else {
    console.error('No jsbundle env specified. Using default configuration.');
  }

  return config;
}

function _resolvePaths(pathsToTry, dir) {
  var file;
  for (var i = 0, len = pathsToTry.length; i < len; i++) {
    file = path.resolve(dir, pathsToTry[i]);
    try {
      fs.statSync(file);
      break;
    } catch (e) {
      file = null;
    }
  }

  return file;
}

function _findEntryFile(dir) {
  var file = _resolvePaths([ 'package.json', 'index.js' ], dir);
  if (file && path.extname(file) === '.json') {
    file = JSON.parse(fs.readFileSync(file, 'utf-8')).main;
  }
  return file;
}

function parseConfig(configFile, env, ignoreMissingEntryFile) {
  configFile = path.resolve(configFile || _resolvePaths([ configFile, 'jsbundle.json' ]));
  var configDir = path.dirname(configFile);
  var entryFile;

  if (configFile) {
    config = _readConfigFile(configFile, env);
    entryFile = config.entryFile;
    console.error('Using jsbundle config file: "' + configFile + '".');
  } else {
    config = {};
    console.error('No jsbundle config file found.');
  }

  if (entryFile) {
    entryFile = path.resolve(configDir, entryFile);
  } else {
    entryFile = _findEntryFile(configDir);
  }

  if (entryFile || ignoreMissingEntryFile) {
    config.entryFile = entryFile;
  } else {
    throw new Error('no entry file found');
  }

  config.extraRequires = _expandExtraRequires(config.extraRequires, configFile);
  config.filters = _initFilters(config, configDir);
  config.bundleUrl = JSON.stringify(config.bundleUrl || '');
  config.devCdnAppends = '';

  return config;
}

module.exports = parseConfig;

