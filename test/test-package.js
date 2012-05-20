var vows = require('vows');
var assert = require('assert');
var path = require('path');
var vm = require('vm');
var jsbundle = require('../jsbundle');
var PACKAGE_DIR = __dirname + '/fixtures/';

vows.describe('package').addBatch({
  "no mangled names": {
    topic: jsbundle.compilePackage(PACKAGE_DIR),

    "find all modules": function(bundled) {
      assert.equal(typeof bundled, 'string');
      assert.match(bundled, /moduleFns\["[^"]+abc.js"\]/);
      assert.match(bundled, /moduleFns\["[^"]+def.js"\]/);
      assert.match(bundled, /moduleFns\["[^"]+ghi.js"\]/);
      assert.match(bundled, /moduleFns\["[^"]+underscore.js"\]/);
    },

    "execute bundled code": function(bundled) {
      var env = {};
      assert.equal(typeof bundled, 'string');
      vm.runInNewContext(bundled, env);
      assert.equal(env.output, 'output from module "def"');
    }
  },

  "mangled names": {
    topic: function() {
      var config = jsbundle.parseConfig(__dirname + '/fixtures/');
      config.mangleNames = true;
      return (new jsbundle.Bundle(config)).compile();
    },

    "execute bundled code": function(bundled) {
      var env = {};
      assert.equal(typeof bundled, 'string');
      vm.runInNewContext(bundled, env);
      assert.equal(env.output, 'output from module "def"');
    }
  }
}).export(module);

