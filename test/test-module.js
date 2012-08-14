var vows = require('vows');
var assert = require('assert');
var path = require('path');
var Module = require('../lib/module');

vows.describe('test Module').addBatch({
  "Module": {
    topic: new Module(__dirname + '/fixtures/abc.js', {
                        extraRequires: {
                          '_': 'underscore'
                        },
                        beforeModuleBody: '',
                        afterModuleBody: ''
                      }),

    "dependencies / extraDependencies": function(mod) {
      var deps = mod.dependencies().sort();
      var extraDeps = mod.extraDependencies().sort();
      assert.equal(deps.length, 3);
      assert.equal(extraDeps.length, 1);
      assert.match(deps[0], /def\.js$/);
      assert.match(extraDeps[0], /underscore.js$/);
    },

    "updateRequires": function(mod) {
      mod.updateRequires();
      var src = mod._wrappedSrc;
      assert.match(src, /underscore.js"\s*\)/);
      assert.match(src, /def.js"\s*\)/);
    },

    "compile": function(mod) {
      mod.setId(123);
      assert.match(mod.compile(), /moduleFns\[123\]/);
    }
  }
}).export(module);

