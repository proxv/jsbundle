var connect = require('connect');
var path = require('path');
var bundle = require('./bundle');

module.exports = function(port, configFile) {
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
        return;
      }

      try {
        var bundled = bundle(filename, configFile);
        resp.writeHead(200, {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-cache'
        });
        resp.write(bundled);
        console.log('DevCdn served file: ' + filename);
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

