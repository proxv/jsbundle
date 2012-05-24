var vows = require('vows');
var assert = require('assert');
var _ = require('underscore');
var createDevCdn = require('../lib/dev-cdn');

vows.describe('test Dev CDN').addBatch({
  "Dev CDN with no env": {
    topic: function() {
      createDevCdn(null, __dirname + '/../', this.callback);
    },

    "found bundles": function(err, bundleConfigs) {
      assert.isNull(err);
      assert.equal(typeof bundleConfigs['jsbundle.js'], 'object');
      assert.equal(_(bundleConfigs).keys().length, 1);
    }
  },

  "Dev CDN with env and cwd": {
    topic: function() {
      createDevCdn('production', __dirname + '/../', this.callback);
    },

    "found bundles": function(err, bundleConfigs) {
      assert.isNull(err);
      assert.equal(typeof bundleConfigs['jsbundle.js'], 'object');
      assert.equal(_(bundleConfigs).keys().length, 1);
    }
  },

  "Dev CDN with bundleConfigs": {
    topic: function() {
      var bundleConfigs = {
        abc: {
          entryFile: __dirname + '/fixtures/abc.js'
        }
      };
      createDevCdn(bundleConfigs, null, this.callback);
    },

    "found bundles": function(err, bundleConfigs) {
      assert.isNull(err);
      assert.equal(typeof bundleConfigs.abc, 'object');
      assert.equal(_(bundleConfigs).keys().length, 1);
    }
  }
}).export(module);


