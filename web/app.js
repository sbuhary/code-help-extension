'use strict';
const explanation = document.getElementById('explanation');
const introduction = document.getElementById('introduction');
const status = document.getElementById('status');
const sizeLabel = document.getElementById('size');
let fontSize = 28;
// Persist across new random-port sessions without cookies or server storage.
try { fontSize = Number(window.name.replace(/^code-help-font:/, '')) || 28; } catch { /* optional */ }
function resize(delta) {
  fontSize = Math.min(64, Math.max(16, fontSize + delta));
  explanation.style.fontSize = `${fontSize}px`;
  introduction.style.fontSize = `${fontSize}px`;
  sizeLabel.textContent = `${fontSize}px`;
  window.name = `code-help-font:${fontSize}`;
}
resize(0);
document.getElementById('smaller').addEventListener('click', () => resize(-2));
document.getElementById('larger').addEventListener('click', () => resize(2));
const events = new EventSource('events');
events.onopen = () => { status.textContent = 'Connected · following your cursor'; };
events.onerror = () => { status.textContent = 'Connection lost · reconnecting…'; };
events.addEventListener('introduction', event => {
  const data = JSON.parse(event.data);
  document.getElementById('introduction-filename').textContent = data.filename;
  introduction.textContent = data.text;
  document.getElementById('introduction-panel').hidden = data.text.length === 0;
});
events.addEventListener('explanation', event => {
  const data = JSON.parse(event.data);
  document.getElementById('filename').textContent = data.filename;
  document.getElementById('range').textContent = data.start === data.end ? `Line ${data.start}` : `Lines ${data.start}–${data.end}`;
  explanation.textContent = data.text;
});
events.addEventListener('stopped', () => {
  events.close();
  status.textContent = 'Stopped · run Code Help: Open Window in VS Code to reconnect';
});
window.addEventListener('pagehide', () => events.close());
