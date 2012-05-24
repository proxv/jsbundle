var path = require('path');
var fs = require('fs');
var exec = require('child_process').exec;
var _ = require('underscore');
var Bundle = require('./bundle');
var parseConfig = require('./parse-config');

var DEV_CDN_APPENDS = "self.devRequire = function(request) {\
  if (typeof _$_mainModuleId === 'number' && typeof request !== 'number') {\
    throw new Error('mangleNames was specified, so modules must be required by their numeric, mangled id');\
  }\
  return _$_require((_$_moduleMap && _$_moduleMap[request]) || request);\
};";

function _findBundles(cwd, env, callback) {
  exec("find . -type f -iname package.json" +
       " '!' -iwholename '*/node_modules/*'",
       { cwd: cwd },
       function(err, stdout, stderr) {
    var packageJsonFiles = stdout.split('\n');
    packageJsonFiles.pop();

    var bundleNameToConfigMap = {};
    _(packageJsonFiles).each(function(file) {
      file = path.resolve(cwd, file);
      var dir = path.dirname(file);
      try {
        var data = JSON.parse(fs.readFileSync(file, 'utf-8'));
        var name = data.name;
        if (name) {
          name = name + '.js';
          try {
            console.error('Found bundle: ' + name);
            bundleNameToConfigMap[name] = parseConfig(dir, env);
          } catch(e) {
            console.error(e.stack);
            console.error('warning: stat failed for package entry file, ignoring package: ' + mainFile);
          }
        } else {
          console.error('warning: no name in package.json, ignoring package: ' + dir);
        }
      } catch(e) {
        console.error('warning: could not read package.json, ignoring package: ' + dir);
      }
    });

    callback(bundleNameToConfigMap);
  });
}


function _createBundle(bundleName, config) {
  config.watch = true;
  config.bundleName = bundleName;
  config.devCdnAppends = DEV_CDN_APPENDS;

  process.stderr.write('\nLoading ' + bundleName + '... ');

  var bundle = new Bundle(config);

  if (bundle.error) {
    console.error('\n' + bundle.error.stack + '\n');
  }
  console.error('done.');

  return bundle;
}

function _createBundles(bundleConfigs) {
  var bundles = {};

  if (!bundleConfigs || _(bundleConfigs).keys().length === 0) {
    throw new Error('Dev CDN could not find any bundles to serve.');
  }

  _(bundleConfigs).each(function(config, bundleName) {
    bundles[bundleName] = _createBundle(bundleName, config);
  });

  console.error('All bundles loaded.');

  return bundles;
}

function _bundleName(req) {
  return req.url.replace(/^\/+|\?.+$/g, '');
}

function _bundleUrl(req, bundleName) {
  bundleName = bundleName || _bundleName(req);
  return 'http://' + req.headers.host + '/' + bundleName;
}

function createDevCdn(envOrBundleConfigs, cwd, loadedCallback) {
  var bundles;
  var bundlesLoaded = false;

  if (!envOrBundleConfigs || typeof envOrBundleConfigs === 'string') {
    var env = envOrBundleConfigs;
    _findBundles(cwd || process.cwd(), env, function(bundleConfigs) {
      bundles = _createBundles(bundleConfigs);
      if (typeof loadedCallback === 'function') {
        loadedCallback(null, bundles);
      }
      bundlesLoaded = true;
    });
  } else if (typeof envOrBundleConfigs === 'object') {
    var bundleConfigs = envOrBundleConfigs;
    process.nextTick(function() {
      bundles = _createBundles(bundleConfigs);
      if (typeof loadedCallback === 'function') {
        loadedCallback(null, bundles);
      }
      bundlesLoaded = true;
    });
  } else {
    throw new Error('invalid env or bundle configs object: ' + envOrBundleConfigs);
  }

  function devCdn(req, resp, next) {
    if (!bundlesLoaded) {
      process.nextTick(function() {
        devCdn(req, resp, next);
      });
      return;
    }

    var bundleName = _bundleName(req);
    var bundle = bundles[bundleName];
    if (bundle) {
      var error;
      var compiled;
      try {
        if (!bundle.loaded) {
          process.stderr.write('\nReloading ' + bundleName + '... ');
          bundle.load();
          console.error('done.');
        }
        compiled = bundle.compile(_bundleUrl(req, bundleName));
      } catch (e) {
        error = e;
      }

      error = error || bundle.error;

      if (error) {
        resp.writeHead(500, { 'Content-Type': 'text/plain' });
        resp.write(error.stack);
        resp.end();
        console.error('\n' + error.stack + '\n');
      } else {
        resp.writeHead(200, {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '-1'
        });

        resp.write(compiled);
        resp.end();
        console.error('DevCdn served bundle: ' + bundleName);
      }

      if (!bundle.loaded) {
        console.error('done.');
      }
    } else {
      resp.writeHead(404, { 'Content-Type': 'text/html' });
      if (bundleName) {
        resp.write('<h1>Bundle "' + bundleName + '" Not Found</h1>');
      }
      resp.write('<h3>Available Bundles:</h3>');
      resp.write('<ul>');
      resp.write(_(bundles).keys().map(function(bundleName) {
        var bundleUrl = _bundleUrl(req, bundleName);
        return '<li><a href="' + bundleUrl + '">' + bundleName + '</a></li>';
      }).join(''));
      resp.write('</ul>');
      resp.end();
    }
  }

  return devCdn;
}

module.exports = createDevCdn;

