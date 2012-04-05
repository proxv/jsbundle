var path = require('path');
var fs = require('fs');
var exec = require('child_process').exec;
var _ = require('underscore');
var Bundle = require('./bundle');
var parseConfig = require('./parse-config');

function _findBundleNames(env, cb) {
  exec("find . -type f -iname package.json" +
       " '!' -iwholename '*/node_modules/*'", function(err, stdout, stderr) {
    var packageJsonFiles = stdout.split('\n');
    packageJsonFiles.pop();

    var bundleNameToConfigMap = {};
    _(packageJsonFiles).each(function(file) {
      var dir = path.dirname(file);
      try {
        var data = JSON.parse(fs.readFileSync(file, 'utf-8'));
        var name = data.name;
        if (name) {
          name = name + '.js';
          var mainFile = path.resolve(dir, data.main || 'index.js');
          try {
            fs.statSync(mainFile);
            console.error('Found bundle: ' + name);
            var config;
            try {
              config = parseConfig(dir + '/jsbundle.json', env, true);
            } catch (e) {
              config = {};
            }
            if (!config.entryFile) {
              config.entryFile = mainFile;
            }
            bundleNameToConfigMap[name] = config;
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


module.exports = function(port, env) {
  var bundles = {};

  _findBundleNames(env, function(bundleConfigs) {
    _(bundleConfigs).each(function(config, bundleName) {
      process.stderr.write('\nLoading ' + bundleName + '... ');
      var bundleUrl = 'http://localhost:' + port + '/' + bundleName;
      config.bundleUrl = JSON.stringify(bundleUrl);
      config.watch = true;
      config.bundleName = bundleName;
      var bundle = new Bundle(config);
      if (bundle.error) {
        console.error('failed:\n' + bundle.error.stack);
      } else {
        bundles[bundleName] = bundle;
        console.error('done. URL: ' + bundleUrl);
      }
    });
    console.error('\nAll bundles loaded. Dev CDN started on port: ' + port);
  });

  return function(req, resp, next) {
    var bundleName = req.url.replace(/^\/+|\?.+$/g, '');
    var bundle = bundles[bundleName];
    if (bundle) {
      var compiled = bundle.compile();

      if (bundle.error) {
        resp.writeHead(500);
        resp.write(bundle.error.stack);
        resp.end();
        console.error(bundle.error.stack);
      } else {
        resp.writeHead(200, {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-cache'
        });

        resp.write(compiled);
        resp.end();
        console.error('DevCdn served bundle: ' + bundleName);
      }
    } else {
      resp.writeHead(404);
      resp.end();
    }
  };
};

