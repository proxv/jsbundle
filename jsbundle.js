var parseConfig = require('./lib/parse-config');
var Bundle = require('./lib/bundle');

function compileBundle(configOrBundleDir, env, bundleUrl) {
  var config;
  if (typeof configOrBundleDir === 'string') {
    var bundleDir = configOrBundleDir;
    config = parseConfig(bundleDir, env, bundleUrl);
  } else {
    config = configOrBundleDir;
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
exports.compileBundle = exports.compilePackage = compileBundle;

