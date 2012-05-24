var parseConfig = require('./lib/parse-config');
var Bundle = require('./lib/bundle');

function compilePackage(configOrPackageDir, env, bundleUrl) {
  var config;
  if (typeof configOrPackageDir === 'string') {
    var packageDir = configOrPackageDir;
    config = parseConfig(packageDir, env, bundleUrl);
  } else {
    config = configOrPackageDir;
  }

  var bundle = new Bundle(config);
  var compiled = bundle.compile();
  if (bundle.error) {
    throw bundle.error;
  } else {
    return compiled;
  }
}

exports.createDevCdn = require('./lib/dev-cdn');
exports.parseConfig = parseConfig;
exports.Bundle = Bundle;
exports.compilePackage = compilePackage;

