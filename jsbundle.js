var parseConfig = require('./lib/parse-config');
var Bundle = require('./lib/bundle');

function compilePackage(packageDir, env, bundleUrl) {
  var config = parseConfig(packageDir, env, bundleUrl);
  var bundle = new Bundle(config);
  var compiled = bundle.compile();
  if (bundle.error) {
    throw bundle.error;
  } else {
    return compiled;
  }
}

exports.devCdn = require('./lib/dev-cdn');
exports.parseConfig = parseConfig;
exports.Bundle = Bundle;
exports.compilePackage = compilePackage;

