var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var template = require('./template');
var Module = require('./module');

function Bundle(options) {
  this._options = options;
  this._entryFile = path.resolve(this._options.entryFile);
  this._options.moduleMap = (this._options.mangleNames ? null : {});
  try {
    this.load();
  } catch (e) {
    this.error = e;
    this.loaded = false;
  }
}

Bundle.prototype = {
  load: function() {
    var counter = 0;
    var files = [ this._entryFile ].concat(this._filesRequiredByFilters());

    this.error = null;
    this._compiledSrc = null;
    this._modules = [];
    this._moduleFileToIdMap = {};
    this._moduleHashToIdMap = {};
    this._moduleFileToModuleMap = {};
    this._multiFileIdSet = {};

    // for ensuring that extra requires don't also require themselves
    var userRequiredFiles = {};
    userRequiredFiles[this._entryFile] = true;
    this._userRequiredModuleIds = {};

    while (files.length > 0) {
      var file = path.resolve(files.shift());
      var id = this._moduleFileToIdMap[file];
      if (!id) { // We haven't seen this file before.
        var mod = new Module(file, this._options);

        // Ignore duplicates, i.e. identical files with different paths.
        // This comes up a lot because of how npm copies modules everywhere and
        // would be very wasteful when served over the network.
        var hash = mod.sha1();
        id = this._moduleHashToIdMap[hash];
        if (!id) { // This module is not a duplicate.
          id = (this._options.mangleNames ? counter++ : file);
          this._moduleHashToIdMap[hash] = id;
          mod.setId(id);

          this._modules.push(mod);

          var deps = mod.dependencies();
          // Mark user-required dependencies of user-required files as also being user-required.
          if (userRequiredFiles[file]) {
            _(deps).each(function(dep) {
              userRequiredFiles[dep] = true;
            });
          }
          files = files.concat(mod.extraDependencies().concat(deps));
        } else {
          this._multiFileIdSet[id] = true;
        }

        this._moduleFileToIdMap[file] = id;

        if (userRequiredFiles[file]) {
          this._userRequiredModuleIds[id] = true;
        }
      }
    }

    _(this._modules).each(function(mod) {
      var filename = mod.filename();
      this._updateModuleRequires(mod);
      if (this._options.watch) {
        this._moduleFileToModuleMap[filename] = mod;
        this._watchFile(filename);
      }
    }, this);

    this.loaded = true;
  },

  _filesRequiredByFilters: function() {
    var requires = [];
    _(this._options.filters).each(function(filter) {
      requires = requires.concat(filter.requires);
    });
    return requires;
  },

	_fileHasChanged: function(filename) {
		var itself = this;
    fs.stat(filename, function(err) {
      if (err) {
        // Ignore deleted files because some editors have non-atomic save.
        return;
      }
      try {
        var mod = itself._moduleFileToModuleMap[filename];
        if (!mod) {
          // This file is no longer part of the bundle, so stop watching it.
					var cdnWatchingBundles = this._options.cdnWatchingBundles;
          cdnWatchingBundles[filename].splice(cdnWatchingBundles[filename].indexOf(this), 1);
          fs.unwatchFile(filename);
          return;
        }
        var oldHash = mod.sha1();
        var newHash = (new Module(filename)).sha1();
        // Only proceed if the file has actually changed.
        if (oldHash !== newHash) {
          itself.error = null;

          var id = mod.id();
          // If this was the only copy of the module,
          // remove its old hash from the hash-to-id map.
          if (!itself._multiFileIdSet[id]) {
            itself._moduleHashToIdMap[oldHash] = null;
          }

          // If the file's dependencies changed,
          // it was previously a duplicate file,
          // or it is now a duplicate file, reload
          // the whole bundle.
          var hasSameDeps = mod.reload();
          if (!hasSameDeps ||
              itself._multiFileIdSet[id] ||
              itself._moduleHashToIdMap[newHash]) {
            console.error('Reloading bundle: ' + itself._options.bundleName || itself._entryFile);
            itself.load();
          } else {
            console.error('Reloading file: ' + filename);
            itself._updateModuleRequires(mod);
            itself._compiledSrc = null;
          }
        }
      } catch (e) {
        itself.error = e;
      }
    });
  },

	_watchFile: function(filename) {
		var cdnWatchingBundles = this._options.cdnWatchingBundles;
    if (!cdnWatchingBundles[filename]) {
			cdnWatchingBundles[filename] = [this];
      fs.watchFile(filename, {
        persistent: false,
        interval: 10
      }, function(stat) {
				cdnWatchingBundles[filename].forEach(function(bundle) {
					bundle._fileHasChanged(filename, stat);
				})
			});
    }
		else
			cdnWatchingBundles[filename].push(this);
  },

  _updateModuleRequires: function(mod) {
    mod.updateRequires(this._moduleFileToIdMap, !this._userRequiredModuleIds[mod.id()]);
  },

  compile: function(bundleUrl) {
    if (!this._compiledSrc && !this.error) {
      try {
        var compiledModules = _(this._modules).map(function(module) {
          return module.compile();
        });

        this._compiledSrc = template.compile('bundle', _.extend({}, this._options, {
          moduleDefs: compiledModules.join('\n\n'),
          mainModuleId: JSON.stringify(this._moduleFileToIdMap[path.resolve(this._entryFile)]),
          moduleMap: JSON.stringify(this._options.moduleMap, null, 2)
        }));
      } catch (e) {
        this.error = e;
      }
    }

    bundleUrl = bundleUrl || this._options.bundleUrl || '';
    return 'var JSBUNDLE_URL = ' + JSON.stringify(bundleUrl) + ';\n' + this._compiledSrc;
  },

  sha1: function() {
    if (!this._compiledSrc) {
      this.compile();
    }
    if (this.error) {
      throw this.error;
    }
    var hash = crypto.createHash('sha1');
    return hash.update(this._compiledSrc, 'utf-8').digest('hex');
  }
}

module.exports = Bundle;

