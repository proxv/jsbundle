# jsbundle -- Node.JS modules for the browser

**jsbundle** takes your Node modules and makes them work in the browser.

It finds all *require* calls in your code and includes the necessary module files. Then, it wraps all these modules using the Node variant of CommonJS module headers.

It handles *node\_modules* directories and *package.json* files just like Node does.

It comes with a "Dev CDN" that will watch your files for changes and serve the latest *jsbundled* version of your code via local HTTP.

It has good error handling and runs without any configuration.


## Quickstart

### Install

    npm install -g jsbundle

Or clone this repo, then from the repo dir, run:

    npm link
    npm install

### Run

From your Node package's directory, run:

    jsbundle

Just for fun, you can try it out with minification:

    npm install -g uglify-js
    jsbundle | uglifyjs --unsafe --lift-vars --consolidate-primitive-values

You can also pipe this to node:

    jsbundle 2>/dev/null | uglifyjs --unsafe --lift-vars --consolidate-primitive-values | node

which should give you the exact same output as:

    node .

## More Detailed Usage Instructions

### jsbundle

    [JSBUNDLE_ENV=<env>] jsbundle <entry_file> [--config=config_file] [--env=env]

Bundle up *entry\_file* and all its dependencies, optionally using configuration specified in *config\_file*, and write it to *stdout*.
If no *config\_file* is specified, *jsbundle* will look for a *jsbundle.json* file in the current working directory and use that if it exists.
You can specify the JSBUNDLE_ENV either via an environment variable or by passing a value to the --env flag.

This command is basically equivalent to running:

    node <entry_file>

in the sense that when the resulting script is executed in the browser, the module *entry\_file* will be the first module to begin executing.

For production deployment, you'll probably want to pipe the resulting output to the JavaScript minifier of your choice.

### devcdn

    [JSBUNDLE_ENV=<env>] devcdn [config_file] [--port=tcp_port] [--env=env]

Start a "Dev CDN", serving on *tcp\_port* (default 8081), optionally using configuration specified in *config\_file*.
The *entry\_file* passed to *jsbundle* is determined by the request URL, which will be resolved based on the *devCdnPaths* defined in the config file (defaulting to the current working directory of *devcdn*).
If no *config\_file* is specified, *devcdn* will look for a *jsbundle.json* file in the current working directory and use that if it exists.
You can specify the JSBUNDLE_ENV either via an environment variable or by passing a value to the --env flag.

## Tests

Test coverage is currently mediocre. You can run tests with:

    npm test

## Caveats

* All values passed to *require* in your code must be string literals. Otherwise, *jsbundle* wouldn't be able to reliably find all the modules to include in the bundled output.

* The special variable *\_\_filename* is equal to the *module.id*. If you specify the *mangleNames* option (see below), then the *\_\_filename* will be the mangled numeric id of the module.

* The special variable *\_\_dirname* doesn't really make sense in the context of browser modules, so while the variable exists, its value is *undefined*.

## Configuration and JSBUNDLE\_ENV

    {
      "defaults": {
        "filters": [
          "logger"
        ],
        "loggerLevel": "debug"
        "mangleNames": false
      },

      "production": {
        "loggerLevel": "error",
        "mangleNames" true
      }
    }

*jsbundle* uses the "defaults" configuration as a base, and then, depending on the value of the JSBUNDLE\_ENV environment variable, overrides or adds more values.
In the example above, if the value of JSBUNDLE\_ENV is "production", "loggerLevel" will be "error" instead of "debug" and module names will be mangled.

**See the included [jsbundle.json](https://github.com/proxv/jsbundle/blob/master/jsbundle.json) for an annotated example of all configuration options.**

## Thanks To

* [substack](https://github.com/substack) for his [browserify](https://github.com/substack/node-browserify) package, which served as inspiration for *jsbundle*.

