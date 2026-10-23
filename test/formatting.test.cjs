const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { render } = require('../web/formatting');

function display(text) {
  const dom = new JSDOM('<div id="target"></div>');
  const target = dom.window.document.getElementById('target');
  render(target, text);
  return { dom, target };
}

test('plain text retains literal brackets, entities, line breaks and indentation', () => {
  const text = 'Person <Name>\n\n  X < 4 && Y > 2\nLiteral &lt; and <script>alert(1)</script>';
  const { target } = display(text);
  assert.equal(target.textContent, text);
  assert.equal(target.children.length, 0);
  assert.equal(target.classList.contains('formatted'), false);
});

test('headings, inline emphasis, lists, entities and preformatted code render', () => {
  const { target } = display('<h2>Overview</h2><p><strong>Bold</strong> and <em>italic</em><br><u>Underline</u> &amp; <mark>marked</mark></p><ul><li>First</li><li>Second</li></ul><pre><code>  X &lt; 4\n  next</code></pre>');
  assert.equal(target.querySelector('strong').textContent, 'Bold');
  assert.equal(target.querySelector('em').textContent, 'italic');
  assert.equal(target.querySelectorAll('li').length, 2);
  assert.equal(target.querySelector('pre').textContent, '  X < 4\n  next');
  assert.equal(target.classList.contains('formatted'), true);
});

test('active content, remote resources, namespaces, styles and all attributes are removed', () => {
  const { target } = display('<h2 id="location" style="position:fixed" onclick="alert(1)">Safe</h2><script>alert(1)</script><style>body{display:none}</style><img src="https://example.com/track" onerror="alert(1)"><iframe srcdoc="bad"></iframe><svg><a href="javascript:alert(1)">bad</a></svg><math><mtext>bad</mtext></math><form><input autofocus></form><template><strong>Hidden</strong></template><a href="javascript:alert(1)">Readable</a><b data-x="x" is="evil">Bold</b>');
  assert.equal(target.textContent, 'SafeReadableBold');
  assert.equal(target.querySelectorAll('script,style,img,iframe,svg,math,form,input,template,a').length, 0);
  for (const node of target.querySelectorAll('*')) { assert.equal(node.attributes.length, 0); }
});

test('malformed markup is sanitized without reparsing sanitized output', () => {
  const { target } = display('<p><b>Safe</p><img/src=x onerror=alert(1)><svg><foreignObject><p onclick=alert(1)>bad</p></foreignObject></svg><strong title="<img src=x>">End');
  for (const node of target.querySelectorAll('*')) {
    assert.equal(node.namespaceURI, 'http://www.w3.org/1999/xhtml');
    assert.equal(node.attributes.length, 0);
  }
  assert.equal(target.querySelector('img'), null);
  assert.ok(target.textContent.includes('Safe'));
  assert.ok(target.textContent.includes('End'));
});

test('SSE introduction and explanation rendering stay independent and support switching back to plain text', () => {
  const fs = require('node:fs');
  const dom = new JSDOM(fs.readFileSync(require('node:path').resolve(__dirname, '../web/index.html'), 'utf8'), { runScripts: 'outside-only' });
  let events;
  dom.window.EventSource = class {
    constructor() { this.listeners = {}; events = this; }
    addEventListener(name, callback) { this.listeners[name] = callback; }
    close() {}
  };
  dom.window.eval(fs.readFileSync(require.resolve('../web/formatting'), 'utf8') + '\n' + fs.readFileSync(require.resolve('../web/app'), 'utf8'));
  const send = (name, data) => events.listeners[name]({ data: JSON.stringify(data) });
  const document = dom.window.document;
  send('introduction', { filename: 'demo.pl', text: '<h2>Intro</h2><p><b>Always visible</b></p>' });
  send('explanation', { filename: 'demo.pl', start: 1, end: 1, text: '<strong>Fact</strong>' });
  assert.equal(document.querySelector('#introduction h2').textContent, 'Intro');
  assert.equal(document.querySelector('#explanation strong').textContent, 'Fact');
  send('explanation', { filename: 'demo.pl', start: 2, end: 2, text: 'Plain\n\n  text' });
  assert.equal(document.querySelector('#explanation').textContent, 'Plain\n\n  text');
  assert.equal(document.querySelector('#explanation').classList.contains('formatted'), false);
  assert.ok(document.querySelector('#introduction b'));
  document.getElementById('larger').click();
  assert.equal(document.getElementById('introduction').style.fontSize, '30px');
  assert.equal(document.getElementById('explanation').style.fontSize, '30px');
  send('introduction', { filename: 'demo.pl', text: '' });
  assert.equal(document.getElementById('introduction-panel').hidden, true);
  dom.window.close();
});
