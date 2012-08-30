# jsbundle -- Node.JS modules for the browser

**jsbundle** takes your Node modules and makes them work in the browser.

It finds all <code>require</code> calls in your code and includes the necessary module files. Then, it wraps all these modules using the Node variant of CommonJS module headers.

It handles <code>node_modules</code> directories and <code>package.json</code> files just like Node does.

It comes with a "Dev CDN" that will watch your files for changes and serve the latest jsbundled version of your code via local HTTP.

It has good error handling and will probably do what you want without any configuration.


## Quickstart

### Install

    npm install -g jsbundle

Or clone this repo, then from the repo dir, run:

    npm link
    npm install

### Run

From your Node package's directory, run:

    jsbundle .

Just for fun, you can try it out with minification:

    npm install -g uglify-js
    jsbundle | uglifyjs --unsafe --lift-vars --consolidate-primitive-values

You can also pipe this to node:

    jsbundle 2>/dev/null | uglifyjs --unsafe --lift-vars --consolidate-primitive-values | node

which should give you the exact same output as:

    node .


## More Detailed Usage Instructions

### jsbundle

    [JSBUNDLE_ENV=<env>] jsbundle <node_package_dir> [--bundle-url=bundle_url]

Create a bundle from the node package contained in node_package_dir.

If the node\_package\_dir contains a "jsbundle.json", that file will be used to configure jsbundle's operation.

The entry file jsbundle will use to start bundling is one of (in decreasing order of precedence):

  * the "entryFile" defined in the "jsbundle.json" file
  * the "main" file defined in the node package's "package.json"
  * the node package's "index.js" file

Specifying a bundle\_url will override any bundle URL defined in the config file. This is useful for versioning/cache busting.

The JSBUNDLE\_ENV environment variable determines how the config file is evaluated (see below).

This command is basically equivalent to running:

    node <node_package_dir>

in the sense that when the resulting script is executed in the browser, the package at node\_package\_dir will be the first to execute.

For production deployment, you'll probably want to pipe the resulting output to the JavaScript minifier of your choice.

### Configuration and JSBUNDLE\_ENV

#### Example Config

    {
      "defaults": {
        "mangleNames": false,
      },

      "production": {
        "mangleNames" true
      }
    }

*jsbundle* uses the "defaults" configuration as a base, and then, depending on the value of the JSBUNDLE\_ENV environment variable, overrides or adds more values.

In the example above, if the value of JSBUNDLE\_ENV is "production", module names will be mangled.

**See the included [jsbundle.json](https://raw.github.com/proxv/jsbundle/master/jsbundle.json) for an annotated example of all configuration options.**

### Loading External Scripts (Like CDN Hosted jQuery) with module.externalDependency

In any of your modules that are browser-only, you can easily add external dependencies that are guaranteed to be loaded before your code executes by using the <code>module.externalDependency</code> function.

    module.externalDependency('https://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js');

Note that the URL you pass to this function must be a constant string.

Multiple calls to module.externalDependency will load any given script URL only once. However, it only does naive string matching, so:

    module.externalDependency('https://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js');
    module.externalDependency('https://AJAX.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js');

will load jQuery twice. To avoid bugs caused by typos, it's advisable to create a wrapper module around each external script you load and then load the wrapper module in the rest of your code. For example:

jquery.js:

    module.externalDependency('https://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js');
    module.exports = $.noConflict(true);

myscript.js:

    var $ = require('./jquery');
    // etc...

If you execute a bundle with external dependencies without a DOM (e.g. in node.js), the dependencies will be silently ignored.

### Mocking / Stubbing Modules

In order to make unit testing your modules easier, jsbundle provides a mocking API:

    module.mock('some-module-name.js', { my: 'mock module.exports object' });
    var someModule = require('../path/to/some-module-name.js');
    // test code here
    module.unmock('some-module-name.js');

* <code>module.mock(moduleIdSubstring, mockExportsObject)</code> takes a string as its first parameter and an arbitrary object as its second parameter. After calling <code>module.mock</code>, all <code>require</code> calls thereafter will return the *mockExportsObject* if the required module's ID matches the *moduleIdSubstring*. Note that if you specified <code>mangleNames: true</code>, the module ID is a somewhat unpredictable mangled numeric name, so it is not recommended to use <code>module.mock</code> with *mangleNames* turned on.

* <code>module.unmock(moduleIdSubstring)</code> disables a previous call to <code>module.mock</code>. The *moduleIdSubstring* must match the one from the corresponding <code>module.mock</code> call exactly.

For integration testing, you'll want to define mocks before loading the bundle by using the global variable <code>jsbundleMocks</code>:

    <script>
      window.jsbundleMocks = {
        'some-module-name.js': { my: 'mock module.exports object' }
      };
    </script>
    <script src="/path/to/my/bundle.js"></script>

You can still <code>module.unmock</code> later on in your test code:

    module.unmock('some-module-name.js');

Again, make sure the strings match exactly.

### devcdn

    [JSBUNDLE_ENV=<env>] devcdn [port]

Start a "Dev CDN" bundle HTTP server.

The Dev CDN will run on the port specified in the config file, or 8081 if none is specified.

The Dev CDN finds all package.json files below the directory from which it is executed and can serve these as bundles. Bundle names are taken from the "name" field of the package.json file, with ".js" appended. node\_modules directories are ignored. So, if you run the Dev CDN from a package directory with the "name" of <code>example</code> and on the default port, you can request the bundled package at the URL: <code>http://localhost:8081/example.js</code>.

You can specify the JSBUNDLE\_ENV (see below) either via an environment variable or by passing a value to the --env flag. The JSBUNDLE\_ENV will be used to evaluate and jsbundle.json files encountered in the served packages.

### jsbundle-s3

    [JSBUNDLE_ENV=env] jsbundle-s3 <node_package_dir> [--dry-run] [--no-minify] [--version-salt=<version_salt>]

Minify and upload your JS code to Amazon's Simple Storage Service (S3).

The options are basically identical to the jsbundle options, with some minor differences:

  1. the <code>--dry-run</code> option, which will run everything *except* the actual S3 upload.
  2. the <code>--no-minify</code> option, which will turn off minification.
  3. the <code>--version-salt</code> option, which will salt the version hash, for the paranoid.
  4. the "s3" key in <code>jsbundle.json</code>, which is as follows:

    <pre>"s3": {
      "accessKeyId": "my_access_key_id",
      "secretAccessKey": "my_secret_access_key",
      "bucketName": "my_bucket",
      "afterUpload": "redis-cli hmset jsbundle.urls $NAME $URL"
    }</pre>

  <code>afterUpload</code> is optional, and runs a shell command with 3 variables set after S3 upload succeeds:

  * <code>$NAME</code> &mdash; the file name (taken from the bundled package's package.json or directory name), e.g.: <code>mypackage.js</code>
  * <code>$VERSION</code> &mdash; the sha1 version string, e.g.: <code>7f2da1cf914bd863068224aa1c10e2ba3a4bd0b0</code>
  * <code>$URL</code> &mdash; the url, without a protocol, of the uploaded file, e.g.: <code>//s3.amazonaws.com/my_bucket/7f2da1cf914bd863068224aa1c10e2ba3a4bd0b0/mypackage.js</code>


## Tests

Test coverage is currently mediocre. You can run tests with:

    npm test


## Caveats

* All values passed to *require* in your code must be string literals. Otherwise, *jsbundle* wouldn't be able to reliably find all the modules to include in the bundled output.

* The special variable *\_\_filename* is equal to the *module.id*. If you specify the *mangleNames* option (see below), then the *\_\_filename* will be the mangled numeric id of the module.

* The special variable *\_\_dirname* doesn't really make sense in the context of browser modules, so while the variable exists, its value is *undefined*.


## Thanks To

* [substack](https://github.com/substack) for his [browserify](https://github.com/substack/node-browserify) package, which served as inspiration for *jsbundle*.

