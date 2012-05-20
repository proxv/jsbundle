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
    var pathToTry = pathsToTry[i];
    if (!pathToTry) {
      continue;
    }

    file = path.resolve(dir, pathToTry);

    try {
      if (fs.statSync(file).isFile()) {
        break;
      }
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
  return file ? path.resolve(dir, file) : null;
}

function parseConfig(configDir, env, bundleUrl) {
  if (!fs.statSync(configDir).isDirectory()) {
    throw new Error('invalid node package directory: ' + path.resolve(configDir));
  }

  var configFile = _resolvePaths([  'jsbundle.json' ], configDir);
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

  if (entryFile) {
    config.entryFile = entryFile;
  } else {
    throw new Error('no entry file found for package: ' + path.resolve(configDir));
  }

  config.extraRequires = _expandExtraRequires(config.extraRequires, configFile);
  config.filters = _initFilters(config, configDir);
  config.bundleUrl = JSON.stringify(bundleUrl || config.bundleUrl || '');
  config.devCdnAppends = '';

  return config;
}

module.exports = parseConfig;

