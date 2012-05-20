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

### devcdn

    [JSBUNDLE_ENV=<env>] devcdn [port]

Start a "Dev CDN" bundle HTTP server.

The Dev CDN will run on the port specified in the config file, or 8081 if none is specified.

The Dev CDN finds all package.json files below the directory from which it is executed and can serve these as bundles. Bundle names are taken from the "name" field of the package.json file, with ".js" appended. node\_modules directories are ignored. So, if you run the Dev CDN from a package directory with the "name" of <code>example</code> and on the default port, you can request the bundled package at the URL: <code>http://localhost:8081/example.js</code>.

You can specify the JSBUNDLE\_ENV (see below) either via an environment variable or by passing a value to the --env flag. The JSBUNDLE\_ENV will be used to evaluate and jsbundle.json files encountered in the served packages.

## Tests

Test coverage is currently mediocre. You can run tests with:

    npm test

## Caveats

* All values passed to *require* in your code must be string literals. Otherwise, *jsbundle* wouldn't be able to reliably find all the modules to include in the bundled output.

* The special variable *\_\_filename* is equal to the *module.id*. If you specify the *mangleNames* option (see below), then the *\_\_filename* will be the mangled numeric id of the module.

* The special variable *\_\_dirname* doesn't really make sense in the context of browser modules, so while the variable exists, its value is *undefined*.


## Configuration and JSBUNDLE\_ENV

### Example Config

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

## Thanks To

* [substack](https://github.com/substack) for his [browserify](https://github.com/substack/node-browserify) package, which served as inspiration for *jsbundle*.

