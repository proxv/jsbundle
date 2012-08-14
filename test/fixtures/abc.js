#!/usr/bin/env node

logger.warn(
  'this code executed!'
);

var def = require(
  './def\
.js'
)();

if (typeof alert !== 'undefined') {
  alert(def);
} else {
  output = def;
  console.log(def);
}


if (typeof document !== 'undefined') {
  var $ = require('./jquery');
  $('<h1>externalDep works!</h1>').appendTo($('body'));
}

require('./ghi.js');

