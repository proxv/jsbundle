#!/usr/bin/env node

output = [];

var numAssertions = 4;
var numSuccesses = 0;

function testResults() {
  if (numSuccesses === numAssertions) {
    log('all ' + numAssertions + ' tests passed!');
  } else {
    error(numSuccesses + ' / ' + numAssertions + ' tests passed');
  }
}

function log(message, color) {
  color = color || '#ada';
  if (typeof document !== 'undefined') {
    document.writeln('<pre style="background-color:' + color + '">' + message + '</pre>');
  } else {
    console.log(message);
    output.push(message);
  }
}

function error(message) {
  log(message, '#daa');
}

function assert(isTrue, description) {
  if (!isTrue) {
    allAssertionsPassed = false;
    error('assertion failed: ' + description);
  } else {
    numSuccesses++;
    log('assertion succeeded: ' + description);
  }
}

if (typeof window !== 'undefined') {
  window.onerror = function(message, script, line) {
    assert(false, 'window.onerror should not fire (got: ' + message + ' at ' + script + ':' + line + ')');
    testResults();
  }
}

logger.
  warn(
  'this code executed!'
);

var def = require(
  './def\
.js'
)();

assert(def === 'output from module "def"', 'got output from module def');

module.mock('', { mock: true });
assert(require('./xyz.js').mock, 'mocking works');

module.unmock('');
assert(!require('./xyz.js').mock, 'unmocking works');

if (typeof document !== 'undefined') {
  var $ = require('./jquery');
  assert($, 'module.externalDependency works');
} else {
  numAssertions--;
}

require('./ghi.js');

testResults();

