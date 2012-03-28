var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var template = require('./template');
var Module = require('./module');

function bundle(entryFile, options) {
  entryFile = path.resolve(entryFile);

  var counter = 0;
  var files = [ entryFile ];

  var modules = {};
  var moduleHashToIdMap = {};
  var moduleFileToIdMap = {};

  // for ensuring that extra requires don't also require themselves
  var userRequiredFiles = {};
  userRequiredFiles[entryFile] = true;
  var userRequiredModuleIds = {};

  while (files.length > 0) {
    var file = path.resolve(files.shift());
    var id = moduleFileToIdMap[file];
    if (!id) { // We haven't seen this file before.
      var mod = new Module(file, options);

      // Ignore duplicates, i.e. identical files with different paths.
      // This comes up a lot because of how npm copies modules everywhere and
      // would be very wasteful when served over the network.
      var hash = mod.sha1();
      id = moduleHashToIdMap[hash];
      if (!id) { // This module is not a duplicate.
        id = moduleHashToIdMap[hash] = (options.mangleNames ? counter++ : file);
        modules[id] = mod;
        var deps = mod.dependencies();

        // Mark user-required dependencies of user-required files as also being user-required.
        if (userRequiredFiles[file]) {
          _(deps).each(function(dep) {
            userRequiredFiles[dep] = true;
          });
        }

        files = files.concat(mod.extraDependencies().concat(deps));
      }

      moduleFileToIdMap[file] = id;

      if (userRequiredFiles[file]) {
        userRequiredModuleIds[id] = true;
      }
    }
  }

  var moduleDefs = [];
  _(modules).each(function(module, id) {
    module.updateRequires(moduleFileToIdMap, !userRequiredModuleIds[id]);
    moduleDefs.push(module.compileWithId(id));
  });

  var src = template.compile('bundle', _(options).extend({
    moduleDefs: moduleDefs.join('\n\n'),
    mainModuleId: JSON.stringify(moduleFileToIdMap[path.resolve(entryFile)])
  }));

  return {
    src: src,
    modules: modules
  };
}

module.exports = bundle;

