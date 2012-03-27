var connect = require('connect');
var path = require('path');
var fs = require('fs');
var _ = require('underscore');
var jsbundle = require('./bundle');

module.exports = function(port, configFile) {
  var cache = {};

  function getBundle(filename) {
    var cacheHit = true;
    var cached = cache[filename];
    filename = path.resolve(filename);

    if (!cached) {
      cacheHit = false;

      function invalidateCache() {
        cache[filename] = null;
      }

      var bundle = jsbundle(filename, configFile);

      cached = cache[filename] = bundle.src;

      _(bundle.modules).each(function(mod) {
        fs.watch(mod.filename(), invalidateCache);
      });
    }

    return {
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

      var filename = path.resolve(req.url.replace(/^\/|\?.+$/, ''));
      if (filename.substr(0, process.cwd().length + 1) !== (process.cwd() + '/')) {
        resp.writeHead(403, { 'Content-Type': 'text/plain' });
        resp.end();
        console.log('Forbidden request to: ' + req.url);
        return;
      }

      try {
        var bundle = getBundle(filename);
        resp.writeHead(200, {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-cache'
        });
        resp.write(bundle.src);
        console.log('DevCdn served file: ' + filename + ' (cache ' + (bundle.cacheHit ? 'hit' : 'miss') + ')');
      } catch (e) {
        resp.writeHead(500, { 'Content-Type': 'text/plain' });
        resp.write(e.stack);
        console.log(e.stack);
      }
      resp.end();
    },

    function(req, resp, next) {
      logger.info('DevCdn file not found: ' + req.url);
    }
  );

  console.log('DevCdn server starting on port ' + port);
  devCdn.listen(port);
  return devCdn;
};

