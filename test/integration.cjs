const vscode = require('vscode');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');

exports.run = async function () {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'code-help-integration-'));
  let request;
  let url;
  const events = [];
  const waiters = new Set();
  const waitFor = (predicate) => new Promise((resolve, reject) => {
    const existing = events.find(predicate);
    if (existing) { resolve(existing); return; }
    const timer = setTimeout(() => { waiters.delete(check); reject(new Error('Timed out waiting for explanation')); }, 10000);
    const check = value => { if (predicate(value)) { clearTimeout(timer); waiters.delete(check); resolve(value); } };
    waiters.add(check);
  });
  const move = (editor, line) => { editor.selection = new vscode.Selection(line - 1, 0, line - 1, 0); };
  try {
    const source = path.join(directory, 'expert_system.pl');
    const properties = path.join(directory, 'expert_system.properties');
    await fs.writeFile(source, 'adult(ali).\n\neligible(X) :-\n  adult(X),\n  employed(X).\n\nmain.\n');
    await fs.writeFile(properties, '[1]\nFact\n[3-5]\nRule\n[4]\nSpecific\n[7]\nEntry');
    const document = await vscode.workspace.openTextDocument(source);
    let editor = await vscode.window.showTextDocument(document);
    move(editor, 1);
    url = await vscode.commands.executeCommand('codeHelp.start');
    assert.match(url, /^http:\/\/127\.0\.0\.1:/);
    await new Promise((resolve, reject) => {
      request = http.get(url + 'events', res => {
        let pending = '';
        res.setEncoding('utf8');
        res.on('data', chunk => {
          pending += chunk;
          let end;
          while ((end = pending.indexOf('\n\n')) >= 0) {
            const frame = pending.slice(0, end); pending = pending.slice(end + 2);
            if (!frame.startsWith('event: explanation')) { continue; }
            const value = JSON.parse(frame.split('\ndata: ')[1]);
            events.push(value); for (const check of waiters) { check(value); }
          }
        });
        resolve();
      });
      request.on('error', reject);
    });
    await waitFor(value => value.text === 'Fact');
    move(editor, 3); await waitFor(value => value.text === 'Rule');
    move(editor, 4); await waitFor(value => value.text === 'Specific');
    // No mapping: a new connection must still receive the previous explanation.
    move(editor, 2);
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.equal(events.at(-1).text, 'Specific');
    move(editor, 7); await waitFor(value => value.text === 'Entry');
    await fs.writeFile(properties, '[7]\nReloaded automatically\n\nSecond paragraph');
    await waitFor(value => value.text === 'Reloaded automatically\n\nSecond paragraph');
    // Atomic replacement and deletion/recreation of a companion.
    await fs.writeFile(properties + '.tmp', '[7]\nAtomic replacement');
    await fs.rename(properties + '.tmp', properties);
    await waitFor(value => value.text === 'Atomic replacement');
    await fs.unlink(properties);
    await fs.writeFile(properties, '[7]\nRecreated');
    await waitFor(value => value.text === 'Recreated');
    const other = path.join(directory, 'other.py');
    await fs.writeFile(other, 'print("hello")\n');
    await fs.writeFile(path.join(directory, 'other.properties'), '[1]\nPython file');
    editor = await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(other));
    await waitFor(value => value.filename === 'other.py' && value.text === 'Python file');
    editor = await vscode.window.showTextDocument(document);
    move(editor, 7);
    await waitFor(value => value.filename === 'expert_system.pl' && value.text === 'Recreated');
    await vscode.commands.executeCommand('codeHelp.reload');
    await vscode.commands.executeCommand('codeHelp.stop');
    request.destroy(); request = undefined;
    await assert.rejects(new Promise((resolve, reject) => {
      const req = http.get(url, res => { res.resume(); resolve(); }); req.on('error', reject);
    }));
    console.log('PASS: real VS Code cursor events, ranges, retention, live reload, atomic saves, recreation, tab switching and stop.');
  } finally {
    request?.destroy();
    await vscode.commands.executeCommand('codeHelp.stop');
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    await fs.rm(directory, { recursive: true, force: true });
  }
};
