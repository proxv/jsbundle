var vows = require('vows');
var assert = require('assert');
var path = require('path');
var bundle = require('../lib/bundle');

vows.describe('module resolution').addBatch({
  "basic": {
    topic: bundle(__dirname + '/fixtures/abc.js', __dirname + '/fixtures/config.json').src,

    "find all modules": function(bundled) {
      assert.match(bundled, /moduleFns\["[^"]+abc.js"\]/);
      assert.match(bundled, /moduleFns\["[^"]+def.js"\]/);
      assert.match(bundled, /moduleFns\["[^"]+ghi.js"\]/);
      assert.match(bundled, /moduleFns\["[^"]+underscore.js"\]/);
    }
  }
}).export(module);

