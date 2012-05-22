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

function _findBundleNames(cwd, env, cb) {
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

    cb(bundleNameToConfigMap);
  });
}


module.exports = function(port, env, cwd) {
  var bundles = {};

  _findBundleNames(cwd || process.cwd(), env, function(bundleConfigs) {
    _(bundleConfigs).each(function(config, bundleName) {
      process.stderr.write('\nLoading ' + bundleName + '... ');

      var bundleUrl = 'http://localhost:' + port + '/' + bundleName;
      config.bundleUrl = JSON.stringify(bundleUrl);
      config.watch = true;
      config.bundleName = bundleName;
      config.devCdnAppends = DEV_CDN_APPENDS;

      var bundle = new Bundle(config);
      bundles[bundleName] = bundle;

      if (bundle.error) {
        console.error('\n' + bundle.error.stack + '\n');
      }
      console.error('done. URL: ' + bundleUrl);
    });
    if (_(bundles).keys().length === 0) {
      throw new Error('Dev CDN could not find any package.json files to serve.');
    }
    console.error('\nAll bundles loaded. Dev CDN started on port: ' + port);
  });

  return function(req, resp, next) {
    var bundleName = req.url.replace(/^\/+|\?.+$/g, '');
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
        compiled = bundle.compile();
      } catch (e) {
        error = e;
      }

      error = error || bundle.error;

      if (error) {
        resp.writeHead(500);
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
      resp.writeHead(404);
      resp.end();
    }
  };
};

