const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const { ExplanationServer } = require('../dist/server');

test('HTTP assets, SSE delivery, reconnect snapshot, access checks and shutdown', async () => {
  const server = new ExplanationServer();
  const url = await server.start(path.resolve(__dirname, '../web'));
  try {
    assert.match(url, /^http:\/\/127\.0\.0\.1:\d+\/[a-f0-9]+\/$/);
    assert.equal(await server.start('unused'), url);
    const html = await fetch(url);
    assert.equal(html.status, 200);
    assert.match(await html.text(), /Code Help/);
    assert.match(html.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.match(await (await fetch(url + 'app.js')).text(), /textContent/);
    assert.equal((await fetch(new URL('/', url))).status, 404);
    assert.equal((await fetch(url, { method: 'POST' })).status, 403);
    assert.equal((await fetch(url, { headers: { Origin: 'https://example.com' } })).status, 403);
    const badHost = await new Promise(resolve => {
      http.get(url, { headers: { Host: 'example.com' } }, res => { res.resume(); resolve(res.statusCode); });
    });
    assert.equal(badHost, 403);
    const abort = new AbortController();
    const response = await fetch(url + 'events', { signal: abort.signal });
    assert.match(response.headers.get('content-type'), /text\/event-stream/);
    const reader = response.body.getReader();
    const expected = { filename: 'hello.py', start: 2, end: 5, text: 'One\n\nTwo <script>' };
    server.publish(expected);
    let buffer = '';
    while (!buffer.includes('event: explanation')) {
      buffer += new TextDecoder().decode((await reader.read()).value);
    }
    assert.ok(buffer.includes(JSON.stringify(expected)));
    abort.abort();
    const reconnectAbort = new AbortController();
    const reconnect = await fetch(url + 'events', { signal: reconnectAbort.signal });
    const reconnectReader = reconnect.body.getReader();
    buffer = '';
    while (!buffer.includes('event: explanation')) {
      buffer += new TextDecoder().decode((await reconnectReader.read()).value);
    }
    assert.ok(buffer.includes(JSON.stringify(expected)));
    reconnectAbort.abort();
  } finally { await server.stop(); }
  await server.stop();
  await assert.rejects(fetch(url));
  const next = await server.start(path.resolve(__dirname, '../web'));
  assert.notEqual(next, url);
  await server.stop();
});
