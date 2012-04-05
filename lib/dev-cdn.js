var connect = require('connect');
var path = require('path');
var fs = require('fs');
var _ = require('underscore');
var Bundle = require('./bundle');
var parseConfig = require('./parse-config');

var bundles = {};

function _findEntryFile(file, paths) {
  var entryFile = null;

  for (var i = 0, len = paths.length; i < len; i++) {
    var dir = path.resolve(paths[i]);
    try {
      entryFile = path.resolve(dir, file);
      fs.statSync(entryFile);
      break;
    } catch (e) {
      entryFile = null;
    }
  }

  // make sure file is actually contained in the directory
  if (entryFile && entryFile.substr(0, dir.length + 1) !== (dir + '/')) {
    throw 403;
  }

  return entryFile;
}

function _getBundle(req, config) {
  var entryFile = _findEntryFile(req.url.replace(/^\/+|\?.+$/g, ''), config.devCdnPaths);
  if (!entryFile) {
    throw 404;
  }

  var bundleUrl = JSON.stringify('http://' + req.headers.host + req.url);
  var bundle = bundles[entryFile];
  config = _.extend({}, config);

  if (!bundle) {
    config.bundleUrl = bundleUrl;
    config.entryFile = entryFile;
    config.watch = true;
    bundle = bundles[entryFile] = new Bundle(config);
  }

  return {
    entryFile: entryFile,
    src: bundle.compile()
  };
}

module.exports = function(config) {
  config.devCdnPaths = config.devCdnPaths || [ process.cwd() ];
  config.devCdnPort = config.devCdnPort || 8081;

  var devCdn = connect().use(
    function(req, resp, next) {
      if (req.url === '/favicon.ico') {
        resp.writeHead(404);
        resp.end();
        return;
      }

      try {
        var bundle = _getBundle(req, config);
        resp.writeHead(200, {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-cache'
        });
        resp.write(bundle.src);
        console.log('DevCdn served bundle: ' + bundle.entryFile);
      } catch (e) {
        if (typeof e === 'number') {
          resp.writeHead(e);
          console.log('Request to: ' + req.url + ' got status code: ' + e);
        } else {
          resp.writeHead(500, { 'Content-Type': 'text/plain' });
          resp.write(e.stack);
          console.log(e.stack);
        }
      }
      resp.end();
    },

    function(req, resp, next) {
      logger.info('DevCdn file not found: ' + req.url);
    }
  );

  console.log('DevCdn starting on port: ' + config.devCdnPort + ', serving files from:\n' + require('util').inspect(config.devCdnPaths))
  return devCdn.listen(config.devCdnPort);
};

