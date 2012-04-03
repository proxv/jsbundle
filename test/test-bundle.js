var vows = require('vows');
var assert = require('assert');
var path = require('path');
var vm = require('vm');
var bundle = require('../lib/bundle');
var parseConfig = require('../lib/parse-config');

vows.describe('bundle').addBatch({
  "no mangled names": {
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
  },

  "mangled names": {
    topic: function() {
      var config = parseConfig(__dirname + '/fixtures/config.json', null);
      config.mangleNames = true;
      return bundle(config).src;
    },

    "execute bundled code": function(bundled) {
      var env = {};
      vm.runInNewContext(bundled, env);
      assert.equal(env.output, 'output from module "def"');
    }
  }
}).export(module);

