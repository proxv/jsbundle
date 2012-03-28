# jsbundle -- Node.JS modules for the browser

**jsbundle** takes your Node modules and makes them work in the browser.

It finds all *require* calls in your code and includes the necessary module files. Then, it wraps all these modules using the Node variant of CommonJS module headers.

It handles *node\_modules* directories and *package.json* files just like Node does.

It comes with a "Dev CDN" that will watch your files for changes and serve the latest *jsbundled* version of your code via local HTTP.

## Usage

### jsbundle

    [JSBUNDLE_ENV=<env>] jsbundle <entry_file> [config_file]

Bundle up *entry\_file* and all its dependencies, optionally using configuration specified in *config\_file*, and write it to *stdout*.
If no *config\_file* is specified, *jsbundle* will look for a *jsbundle.json* file in the current working directory and use that if it exists.

This command is basically equivalent to running:

    node <entry_file>

in the sense that when the resulting script is executed in the browser, the module *entry\_file* will be the first module to begin executing.

For production deployment, you'll probably want to pipe the resulting output to the JavaScript minifier of your choice.

### devcdn

    [JSBUNDLE_ENV=<env>] devcdn [config_file] [--port tcp_port]

Start a "Dev CDN", serving on *tcp\_port* (default 8081), optionally using configuration specified in *config\_file*.
The *entry\_file* passed to *jsbundle* is determined by the request URL, which will be resolved relative to the current working directory of *devcdn*.
If no *config\_file* is specified, *devcdn* will look for a *jsbundle.json* file in the current working directory and use that if it exists.

## Tests

Test coverage is currently mediocre. You can run tests with:

    npm test

## Caveats

* All values passed to *require* in your code must be string literals. Otherwise, *jsbundle* wouldn't be able to reliably find all the modules to include in the bundled output.

* The special variable *\_\_filename* is equal to the *module.id*. If you specify the *mangleNames* option (see below), then the *\_\_filename* will be the mangled numeric id of the module.

* The special variable *\_\_dirname* doesn't really make sense in the context of browser modules, so while the variable exists, its value is *undefined*.

## Configuration and JSBUNDLE\_ENV

### Example jsbundle.json

    {
      "default": {
        "mangleNames": false,
        "beforeBundle": [],
        "afterBundle": [],

        "extraRequires": {
          "_": "underscore",
          "Logger": "./ext/logger"
        },
        "beforeModuleBody": [
          "var logger = new Logger(__filename);"
        ],
        "afterModuleBody": [],

        "outputFilters": [
          "./ext/logger-filter"
        ]
        "loggerFilterLevel": "debug"
      },

      "production": {
        "mangleNames": true,
        "loggerFilterLevel": "error",
        "bundleUrl": "https://s3.amazonaws.com/xyz/abc.js"
      },

      "development": {
        "outputFilters": []
      }
    }

*jsbundle* uses the "default" configuration as a base, and then, depending on the value of the JSBUNDLE\_ENV environment variable, overrides or adds more values.
In the example above, if the value of JSBUNDLE\_ENV is "production", "mangleNames" will be true and the "loggerFilterLevel" will be "error".
If the value of JSBUNDLE\_ENV is "development", no output filters will be appplied.

### mangleNames
By default, *jsbundle* uses the absolute path of a file as its module id. This is useful for development, but in production it's wasteful and potentially reveals information you want to keep private. If you enable the **mangleNames** option, module ids will be numeric instead.

### beforeBundle
An array of arbitrary JavaScript statements to insert *before* the entire bundle.

### afterBundle
An array of arbitrary JavaScript statements to insert *after* the entire bundle.

### extraRequires
You can specify additional requires that *jsbundle* will automatically add to all of your modules. This is useful for e.g. ensuring you always have underscore available without having to pollute the global namespace or remember to manually require it every time. The value for this configuration option must be an object literal, with keys the variable name for the required module and values the path to the module. **Relative paths will be resolved relative to the config file location.**

### beforeModuleBody
An array of arbitrary JavaScript statements to insert *before* every module body.

### afterModuleBody
An array of arbitrary JavaScript statements to insert *after* every module body.

### outputFilters
An array of output filters module files, resolved relative to the config file path.

Output filters allow you to specify additional ways to transform your module code. They are regular Node modules that must export an *init* function. This function takes in the *jsbundle* configuration object as a parameter and returns a second function. The returned function must accept a string containing the source code of a module and return the transformed source code, also as a string.

Example:

    exports.init = function(config) {
      return function(sourceCode) {
        return sourceCode + '; alert("this is a silly output filter");';
      };
    };

[Here is a more useful example.](https://github.com/proxv/jsbundle/blob/master/ext/logger-filter.js)

**Note**: output filters may require additional configuration options, like the *loggerFilterLevel* above. These values should be written into the same configuration JSON file. If you write your own output filter, it's probably a good idea to avoid collisions by prefixing additional configuration option names with the name of the output filter.

### bundleUrl
The bundleUrl will be accessible in your code by accessing *module.bundleUrl*. If having this information accessible from your code would be useful, set its value to the url from which you'll be serving the bundled code.
The "Dev CDN" configures this value automatically for bundles that it serves.

## Thanks To

* [substack](https://github.com/substack) for his [browserify](https://github.com/substack/node-browserify) package, which served as inspiration for *jsbundle*.

