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

require('./ghi.js');

