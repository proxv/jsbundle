var fs = require('fs');
var path = require('path');
var _ = require('underscore');

function _expandExtraRequires(extraRequires, relativeToDir) {
  var expandedRequires = {};
  _(extraRequires).each(function (value, key) {
    var resolvedPath = value;
    if (value.charAt(0) === '.') {
      resolvedPath = path.resolve(relativeToDir, value);
    }
    expandedRequires[key] = resolvedPath;
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

function _resolvePaths(pathsToTry) {
  var file;
  for (var i = 0, len = pathsToTry.length; i < len; i++) {
    file = pathsToTry[i];
    try {
      fs.statSync(file);
      break;
    } catch (e) {
      file = null;
    }
  }

  return file;
}

function _findEntryFile() {
  var file = _resolvePaths([ 'package.json', 'index.js' ]);
  if (file && path.extname(file) === '.json') {
    file = JSON.parse(fs.readFileSync(file, 'utf-8')).main;
  }
  return file;
}

function parseConfig(configFile, entryFile, env) {
  configFile = configFile || _resolvePaths([ configFile, 'jsbundle.json' ]);
  var configDir = path.dirname(configFile);

  if (configFile) {
    config = _readConfigFile(configFile, env);
    entryFile = entryFile || config.entryFile;
    console.error('Using jsbundle config file: "' + configFile + '".');
  } else {
    config = {};
    console.error('No jsbundle config file found.');
  }

  if (entryFile) {
    entryFile = path.resolve(configDir, entryFile);
  } else {
    entryFile = _findEntryFile();
  }

  if (entryFile) {
    config.entryFile = entryFile;
  } else {
    throw new Error('no entry file found');
  }

  config.filters = _initFilters(config, configDir);
  config.bundleUrl = JSON.stringify(config.bundleUrl || '');

  return config;
}

module.exports = parseConfig;

