var fs = require('fs');
var path = require('path');
var uglifyjs = require('uglify-js');
var jsbundle = require('../jsbundle');
var awssum = require('awssum');
var amazon = awssum.load('amazon/amazon');
var Q = require('q');
var S3 = awssum.load('amazon/s3').S3;
var zlib = require('zlib');
var exec = require('child_process').exec;
var crypto = require('crypto');

function createBundle(bundlePath, env, options) {
  var jsbundleConfig = jsbundle.parseConfig(bundlePath, env);
  var s3Config = jsbundleConfig.s3 || jsbundleConfig.S3;
  if (!s3Config) {
    throw new Error('No "s3" key found in ' + path.resolve(bundlePath + '/jsbundle.json for env: "' + env + '"'));
  } else if (!s3Config.bucketName) {
    throw new Error('No bucket name specified in S3 config for env: "' + env + '"');
  }
  s3Config.region = s3Config.region || amazon.US_EAST_1

  var bundleName = _bundleName(bundlePath);
  s3Config.bundleName = bundleName;

  process.stderr.write('Creating bundle' + (options.dryRun ? ' (DRY RUN)' : '') + ': ' + bundleName + ' ... ');

  process.stderr.write('bundling ... ');
  var bundle = new jsbundle.Bundle(jsbundleConfig);

  var version = bundle.sha1();
  if (options.versionSalt || options.noMinify) { // For the paranoid, to avoid exposing hash of unminified code,
                                                 // or to ensure unminified and minified version numbers are distinct.
    var sha1 = crypto.createHash('sha1');
    sha1.update((options.versionSalt || 'unminified')  + version);
    version = sha1.digest('hex');
  }
  s3Config.version = version;

  var bundleUrl = '//s3.amazonaws.com/' + s3Config.bucketName + '/' + version + '/' + bundleName;
  s3Config.url = bundleUrl;

  var bundledCode = bundle.compile(bundleUrl);

  process.stderr.write('checking for existing bundle ... ');
  var s3 = new S3(s3Config);
  Q.ncall(s3.GetObject, s3, {
    BucketName: s3Config.bucketName,
    ObjectName: s3Config.version + '/' + s3Config.bundleName,
  })
  .then(function() {
    console.error('not uploading to S3 because version "' + version + '" already exists.');
    _afterUpload(s3Config);
  }, function(res) {
    if (res.StatusCode === 404) {
      var code;
      if (!options.noMinify) {
        process.stderr.write('minifying ... ');
        code = _uglify(bundledCode);
      } else {
        process.stderr.write('skipping minification ... ');
        code = bundledCode;
      }

      process.stderr.write('gzipping ... ');
      Q.ncall(zlib.gzip, zlib, code)
      .then(function(data) {
        try {
          console.error('done.');
          console.error('Final file size: ' + Math.round(data.length / 1024) +
                        'kB (' + Math.round((1 - data.length / Buffer.byteLength(bundledCode)) * 100) + '% savings)');

          if (options.dryRun) {
            console.error('This is a dry run, so not uploading to S3.');
          } else {
            _s3upload(data, s3Config);
          }
        } catch (e) {
          console.error(e);
        }
      }, function(err) {
        console.error(err);
      });
    } else {
      throw new Error(JSON.stringify(res.Body.Error));
    }
  });
}

function _s3upload(data, s3Config) {
  var s3 = new S3(s3Config);

  var options = {
    BucketName: s3Config.bucketName,
    ObjectName: s3Config.version + '/' + s3Config.bundleName,
    Acl: 'public-read',
    ContentType: 'application/javascript',
    ContentEncoding: 'gzip',
    CacheControl: 'max-age=31536000',
    Body: data,
    ContentLength: data.length
  };

  process.stderr.write('Uploading to S3 ... ');

  s3.PutObject(options, function(err, data) {
    if (err) {
      throw new Error(JSON.stringify(err.Body.Error));
    } else {
      console.error('Success!');
      _afterUpload(s3Config);
    }
  });
}

function _bundleName(bundlePath) {
  var name;
  try {
    name = JSON.parse(fs.readFileSync(bundlePath + '/package.json')).name;
  } catch (e) {
    var parts = bundlePath.replace(/\/\s*$/, '').split('/');
    name = parts[parts.length - 1];
  }

  if (!/\.js$/.test(name)) {
    name = name + '.js';
  }

  return name;
}

function _afterUpload(s3Config) {
  if (s3Config.afterUpload) {
    var envVars = 'NAME="' + s3Config.bundleName + '" ' +
                  'URL="' + s3Config.url + '" ' +
                  'VERSION="' + s3Config.version + '"';
    var cmd = envVars + " bash -c '" + s3Config.afterUpload + "'";
    console.error('Executing: ' + cmd);
    exec(cmd, function(err, stdout, stderr) {
      if (stdout) {
        process.stdout.write(stdout);
      }
      if (stderr) {
        process.stderr.write(stderr);
      }
    });
  }
}

function _uglify(code) {
  var ast = uglifyjs.parser.parse(code);
  process.stderr.write('consolidating property names ... ');
  ast = uglifyjs.consolidator.ast_consolidate(ast);
  process.stderr.write('mangling variable names ... ');
  ast = uglifyjs.uglify.ast_mangle(ast);
  process.stderr.write('squeezing AST ... ');
  ast = uglifyjs.uglify.ast_squeeze(ast);
  ast = uglifyjs.uglify.ast_squeeze_more(ast);

  return uglifyjs.uglify.gen_code(ast);
}

exports.createBundle = createBundle;

