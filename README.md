# jsbundle -- Node.JS modules for the browser

**jsbundle** takes your Node modules and makes them work in the browser.

It finds all *require* calls in your code and includes the necessary module files. Then, it wraps all these modules using the Node variant of CommonJS module headers.

It handles *node\_modules* directories and *package.json* files just like Node does.

It comes with a "Dev CDN" that will watch your files for changes and serve the latest *jsbundled* version of your code via local HTTP.

## Usage

### jsbundle

    jsbundle <entry_file> [config_file]

Bundle up *entry\_file* and all its dependencies, optionally using configuration specified in *config\_file*, and write it to *stdout*.

This command is basically equivalent to running:

    node <entry_file>

in the sense that when the resulting script is executed in the browser, the module *entry\_file* will be the first module to begin executing.

For production deployment, you'll probably want to pipe the resulting output to the JavaScript minifier of your choice.

### devcdn

    devcdn [config_file] [--port tcp_port]

Start a "Dev CDN", serving on *tcp\_port* (default 8081), optionally using configuration specified in *config\_file*.
The *entry\_file* passed to *jsbundle* is determined by the request URL, which will be resolved relative to the current working directory of *devcdn*.

## Tests

Test coverage is currently mediocre. You can run tests with:

    npm test

## Caveats

* All values passed to *require* in your code must be string literals. Otherwise, *jsbundle* wouldn't be able to reliably find all the modules to include in the bundled output.

* The special variable *\_\_filename* is equal to the *module.id*. If you specify the *mangleNames* option (see below), then the *\_\_filename* will be the mangled numeric id of the module.

* The special variable *\_\_dirname* doesn't really make sense in the context of browser modules, so while the variable exists, its value is *undefined*.

## Config

### Example

    {
      "outputFilters": [
        "./ext/logger-filter"
      ],
      "extraRequires": {
        "_": "underscore",
        "Logger": "./ext/logger"
      },
      "beforeModuleBody": [
        "var logger = new Logger(__filename);"
      ],
      "afterModuleBody": [],
      "mangleNames": true,
      "logLevel": "off"
    }

All configuration is optional. If you want to configure *jsbundle* operation, create a JSON file with one or more of the following key/value pairs:

### mangleNames
By default, *jsbundle* uses the absolute path of a file as its module id. This is useful for development, but in production it's wasteful and potentially reveals information you want to keep private. If you enable the **mangleNames** option, module ids will be numeric instead.

### extraRequires
You can specify additional requires that *jsbundle* will automatically add to all of your modules. This is useful for e.g. ensuring you always have underscore available without having to pollute the global namespace or remember to manually require it every time. The value for this configuration option must be an object literal, with keys the variable name for the required module and values the path to the module. **Relative paths will be resolved relative to the config file location.**

### beforeModuleBody
An array of arbitrary JavaScript statements to insert **before** every module body.

### afterModuleBody
An array of arbitrary JavaScript statements to insert **after** every module body.

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

## Thanks To

* [substack](https://github.com/substack) for his [browserify](https://github.com/substack/node-browserify) package, which served as inspiration for *jsbundle*.

