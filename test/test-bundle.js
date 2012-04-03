var vows = require('vows');
var assert = require('assert');
var path = require('path');
var vm = require('vm');
var bundle = require('../lib/bundle');
var parseConfig = require('../lib/parse-config');

vows.describe('bundle').addBatch({
  "all": {
    topic: bundle(parseConfig(__dirname + '/fixtures/config.json', null)).src,

    "find all modules": function(bundled) {
      assert.match(bundled, /moduleFns\["[^"]+abc.js"\]/);
      assert.match(bundled, /moduleFns\["[^"]+def.js"\]/);
      assert.match(bundled, /moduleFns\["[^"]+ghi.js"\]/);
      assert.match(bundled, /moduleFns\["[^"]+underscore.js"\]/);
    },

    "execute bundled code": function(bundled) {
      var env = {};
      vm.runInNewContext(bundled, env);
      assert.equal(env.output, 'output from module "def"');
    }
  }
}).export(module);

