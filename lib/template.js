var fs = require('fs');
var _ = require('underscore');

function compile(templateName, data) {
  data = data || {};
  var filename = __dirname + '/../tmpl/' + templateName + '.tmpl';
  var template = fs.readFileSync(filename, 'utf-8');
  return template.replace(/@(\w+)/g, function(ignored, key) {
    if (data[key] !== void 0) {
      return data[key];
    } else {
      throw new Error("missing template data: '" + key + "'");
    }
  });
}

exports.compile = compile;

