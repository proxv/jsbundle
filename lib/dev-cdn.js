var connect = require('connect');
var path = require('path');
var fs = require('fs');
var _ = require('underscore');
var jsbundle = require('./bundle');
var parseConfig = require('./parse-config');

module.exports = function(port, configFile) {
  var cache = {};
  var config = parseConfig(configFile);

  function getBundle(req) {
    var filename = path.resolve(req.url.replace(/^\/|\?.+$/g, ''));
    var bundleUrl = JSON.stringify('http://' + req.headers.host + req.url);
    var cacheHit = true;
    var cached = cache[filename];

    if (filename.substr(0, process.cwd().length + 1) !== (process.cwd() + '/')) {
      throw 403;
    }

    if (!cached) {
      cacheHit = false;

      function invalidateCache() {
        cache[filename] = null;
      }

      config.bundleUrl = bundleUrl;
      var bundle = jsbundle(filename, config);

      cached = cache[filename] = bundle.src;

      _(bundle.modules).each(function(mod) {
        // Yeah, this leaks callbacks, but it's not like this is a production
        // server or anything, so we'll turn a blind eye for now.
        fs.watch(mod.filename(), invalidateCache);
      });
    }

    return {
      filename: filename,
      src: cached,
      cacheHit: cacheHit
    };
  }

  var devCdn = connect().use(
    function(req, resp, next) {
      if (req.url === '/favicon.ico') {
        resp.writeHead(404);
        resp.end();
        return;
      }

      try {
        var bundle = getBundle(req);
        resp.writeHead(200, {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-cache'
        });
        resp.write(bundle.src);
        console.log('DevCdn served file: ' + bundle.filename + ' (cache ' + (bundle.cacheHit ? 'hit' : 'miss') + ')');
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

  console.log('DevCdn server starting on port "' + port + '".');
  devCdn.listen(port);
  return devCdn;
};

