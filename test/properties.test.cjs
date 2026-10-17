const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseProperties, findExplanation, companionPath } = require('../dist/properties');

test('UTF-8 BOM, CRLF, paragraphs, indentation and literal punctuation', () => {
  const sections = parseProperties('\uFEFF[1]\r\nFirst line.\r\n\r\n  :- \\path <b>literal</b>\r\n\r\n[3-5]\r\nRule');
  assert.deepEqual(sections, [
    { start: 1, end: 1, text: 'First line.\n\n  :- \\path <b>literal</b>' },
    { start: 3, end: 5, text: 'Rule' }
  ]);
});
test('inclusive ranges, narrowest match and stable equal-width ties', () => {
  const sections = parseProperties('[1-10]\nBroad\n[3-5]\nNarrow\n[4]\nExact\n[3-5]\nLater');
  assert.equal(findExplanation(sections, 1).text, 'Broad');
  assert.equal(findExplanation(sections, 3).text, 'Narrow');
  assert.equal(findExplanation(sections, 4).text, 'Exact');
  assert.equal(findExplanation(sections, 5).text, 'Narrow');
  assert.equal(findExplanation(sections, 10).text, 'Broad');
  assert.equal(findExplanation(sections, 11), undefined);
});
test('invalid numeric ranges do not contaminate the preceding section', () => {
  assert.deepEqual(parseProperties('preamble\n[1]\nGood\n[5-3]\nBad\n[0]\nBad\n[9007199254740992]\nBad'),
    [{ start: 1, end: 1, text: 'Good' }]);
});
test('all source extensions and extensionless names use companion basename', () => {
  for (const name of ['hello.pl', 'hello.py', 'hello.java', 'hello.ts', 'hello']) {
    assert.equal(companionPath(name), 'hello.properties');
  }
  assert.equal(companionPath('hello.test.py'), 'hello.test.properties');
});
