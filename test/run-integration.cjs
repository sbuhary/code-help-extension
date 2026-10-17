const path = require('node:path');
const { runTests } = require('@vscode/test-electron');
// Codex/terminal hosts may inherit this; desktop Electron must start as an app.
delete process.env.ELECTRON_RUN_AS_NODE;
const options = {
  extensionDevelopmentPath: path.resolve(__dirname, '..'),
  extensionTestsPath: path.resolve(__dirname, 'integration.cjs'),
  launchArgs: ['--disable-extensions', '--skip-welcome', '--skip-release-notes', '--disable-workspace-trust'],
};
if (process.env.VSCODE_EXECUTABLE_PATH) { options.vscodeExecutablePath = process.env.VSCODE_EXECUTABLE_PATH; }
runTests(options).catch(error => { console.error(error); process.exitCode = 1; });
