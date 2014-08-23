var parseConfig = require('./lib/parse-config');
var Bundle = require('./lib/bundle');
var uglifyjs = require('uglify-js');

function _uglify(code) {
  var ast = uglifyjs.parser.parse(code);
  ast = uglifyjs.consolidator.ast_consolidate(ast);
  ast = uglifyjs.uglify.ast_mangle(ast);
  ast = uglifyjs.uglify.ast_squeeze(ast);
  ast = uglifyjs.uglify.ast_squeeze_more(ast);

  return uglifyjs.uglify.gen_code(ast);
}

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
  } else if (config.minify) {
    return _uglify(compiled);
  } else {
    return compiled;
  }
}

exports.createDevCdn = require('./lib/dev-cdn');
exports.parseConfig = parseConfig;
exports.Bundle = Bundle;
exports.compileBundle = exports.compilePackage = compileBundle;

