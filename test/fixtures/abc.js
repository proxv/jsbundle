#!/usr/bin/env node

logger.
  warn(
  'this code executed!'
);

var def = require(
  './def\
.js'
)();

module.mock('xyz.js', { mock: true });
module.mock('3', { mock: true });
if (!require('./xyz.js').mock) {
  throw new Error('mocking failed');
}
module.unmock('xyz.js');
module.unmock('3');
if (require('./xyz.js').mock) {
  throw new Error('unmocking failed');
}

if (typeof alert !== 'undefined') {
  alert(def);
} else {
  output = def;
  console.log(def);
}


if (typeof document !== 'undefined') {
  var $ = require('./jquery');
  $('<h1>externalDependency works!</h1>').appendTo($('body'));
}

require('./ghi.js');

