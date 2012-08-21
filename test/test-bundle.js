var vows = require('vows');
var assert = require('assert');
var path = require('path');
var vm = require('vm');
var jsbundle = require('../jsbundle');
var _ = require('underscore');
var BUNDLE_DIR = __dirname + '/fixtures/';

function execute(code, env) {
  env.global = env;
  try {
    vm.runInNewContext(code, env);
  } catch (e) {
    console.error(code);
    assert.equal(e.message, void 0);
  }
}

vows.describe('bundle').addBatch({
  "no mangled names": {
    topic: jsbundle.compileBundle(BUNDLE_DIR),

    "find all modules": function(bundled) {
      assert.equal(typeof bundled, 'string');
      assert.match(bundled, /moduleFns\["[^"]+abc.js"\]/);
      assert.match(bundled, /moduleFns\["[^"]+def.js"\]/);
      assert.match(bundled, /moduleFns\["[^"]+ghi.js"\]/);
      assert.match(bundled, /moduleFns\["[^"]+underscore.js"\]/);
    },

    "execute bundled code": function(bundled) {
      var env = {
        console: {
          log: function() {}
        }
      };
      assert.equal(typeof bundled, 'string');
      execute(bundled, env);
      _.each(env.output, function(outputLine) {
        assert.match(outputLine, /^assertion succeeded:|^all \d+ tests passed/);
      });
    }
  },

  "mangled names": {
    topic: function() {
      var config = jsbundle.parseConfig(__dirname + '/fixtures/');
      config.mangleNames = true;
      return (new jsbundle.Bundle(config)).compile();
    },

    "execute bundled code": function(bundled) {
      var env = {
        console: {
          log: function() {}
        }
      };
      assert.equal(typeof bundled, 'string');
      execute(bundled, env);
      _.each(env.output, function(outputLine) {
        assert.match(outputLine, /^assertion succeeded:|^all \d+ tests passed/);
      });
    }
  }
}).export(module);

