# Code Help

A small TypeScript VS Code extension that follows the cursor and displays your own plain-text explanations in a browser on a second monitor. No AI, network services, runtime dependencies, polling, or page refreshes.

## Install and use the VSIX (no coding setup needed)

You only need desktop VS Code and a browser. You do **not** need Node.js, npm, Git, F5, or the extension's source code.

1. Open [Releases](https://github.com/sbuhary/code-help-extension/releases/latest). Under **Assets**, download the file ending in `.vsix`. Do not download **Source code**.
2. In VS Code, open **Extensions** (`Ctrl+Shift+X`). Click **…** at the top of the Extensions panel, choose **Install from VSIX…**, and select the downloaded file. Reload VS Code if prompted.
3. Open your own code file, for example `expert_system.pl`.
4. In the **same folder**, create `expert_system.properties`. Use the same filename with its final extension replaced by `.properties`. For Python, `hello.py` uses `hello.properties`; for Java, `Main.java` uses `Main.properties`.
5. Add your explanations and save the properties file. For example:

   ```text
   [introduction]
   This is an overview of the program.
   It stays visible above the line explanations as you move the cursor.

   [1]
   This explanation appears when the cursor is on line 1.

   [3-5]
   This explanation appears on lines 3, 4, and 5.

   A second paragraph is fine too.
   ```

6. Return to the **code file**. Press `Ctrl+Shift+P` (`Cmd+Shift+P` on macOS), type **Code Help: Start**, and press Enter.
7. The explanation page opens in your browser. Put it in a separate browser window and move it to monitor 2. Keep VS Code on monitor 1.
8. Click or move the cursor to a mapped line in VS Code. Its explanation appears automatically. Use **A− / A+** in the browser to change the text size.

Write the explanations yourself; the extension displays the saved text. The optional `[introduction]` section stays visible at the top, while numbered sections change with the cursor. Save changes to the `.properties` file to update them automatically. Unmapped lines keep the previous explanation. Run **Code Help: Open Window** if you close the browser page, or **Code Help: Stop** when finished.

If nothing appears, check that both files are saved, their basenames match exactly, the properties file is beside the source, and your cursor is on a line listed in a section header. You can download the [example source](https://raw.githubusercontent.com/sbuhary/code-help-extension/main/examples/expert_system.pl) and [example explanations](https://raw.githubusercontent.com/sbuhary/code-help-extension/main/examples/expert_system.properties) into the same local folder to try it.

To update, download a newer VSIX and repeat **Install from VSIX…**. To uninstall, find **Code Help** in Extensions, click its gear menu, and choose **Uninstall**.

## Download an automated build

For a stable package, use [Releases](https://github.com/sbuhary/code-help-extension/releases). Release downloads are public and do not require a GitHub login.

For the newest development build, open [Actions → Build VSIX](https://github.com/sbuhary/code-help-extension/actions/workflows/build-vsix.yml), open a successful run, and download **code-help-vsix** under **Artifacts**. Extract the ZIP and install the `.vsix` inside. GitHub requires you to sign in to download workflow artifacts; they expire after 30 days.

## Run with F5

The remaining setup instructions are for developers who want to build or change the extension. Prerequisites: desktop VS Code 1.90 or newer, Node.js 22 LTS or newer, npm, and a modern browser. Prolog/Python/Java runtimes are not required to show explanations.

Clone the project; the root folder will be `code-help-extension`:

```sh
git clone https://github.com/sbuhary/code-help-extension.git
cd code-help-extension
code .
```

1. Open this project folder in VS Code.
2. In the integrated terminal, run:

   ```sh
   npm install
   npm run compile
   ```

   On Windows PowerShell, if script execution policy blocks `npm.ps1`, use `npm.cmd` instead of `npm` for every command below.
3. Press **F5** and select **Run Code Help** if prompted. A separate **Extension Development Host** opens with the `examples` folder. F5 also compiles the project.
4. In that development host, open `expert_system.pl`.
5. Open the Command Palette (`Ctrl+Shift+P`, or `Cmd+Shift+P` on macOS) and run **Code Help: Start**.
6. The display opens in your default browser. Move its tab into a separate browser window, drag the window to monitor 2, and optionally press F11 for full screen. Keep VS Code on monitor 1. Browsers decide whether external URLs open as tabs or windows; the extension does not control your window manager.
7. Click source lines 1, 3, 4, 5, 7 and 9. Line 4 has a more specific explanation than the surrounding 3–5 range. Blank unmapped lines retain the last explanation.
8. Use **A− / A+** in the browser to adjust text from 16px to 64px. The setting stays with that browser window. The page never focuses itself during updates.
9. Edit and **save** `expert_system.properties`; the display reloads automatically. Unsaved properties edits are not loaded.
10. Run **Code Help: Stop** to close the listener and file watcher. The browser window stays open with its last explanation. After restarting, use **Open Window** for the new session URL. Stop debugging with Shift+F5 when finished.

You can also launch a dedicated Chrome/Edge app window manually using the full URL logged under **View → Output → Code Help**:

```text
chrome --app="http://127.0.0.1:PORT/SESSION/"
msedge --app="http://127.0.0.1:PORT/SESSION/"
```

Replace the URL with the actual session URL. Browser executable names/paths depend on your installation.

## Explanation files

### Always-visible introduction

Add an optional `[introduction]` section to your properties file for an overview, background, or notes that stay visible above the changing line explanation:

```text
[introduction]
This program checks eligibility using Prolog facts and rules.

These notes remain visible while you move between lines.

[1]
This explanation changes with the cursor.
```

The introduction supports literal multiline text and blank paragraphs, just like line explanations. Its header is case-insensitive and may appear anywhere in the file; the first introduction section wins if repeated. Save the file to update it immediately, even when the cursor is on an unmapped line. Switching source files loads that file's introduction; a missing or empty introduction hides the panel. The panel shows its source filename and stays above the independently scrolling line explanation. Long introductions scroll within the panel, which uses at most 40% of the window height. **A− / A+** adjusts both areas. Existing properties files without this section continue to work.

Place the companion beside the source, replacing its final extension with `.properties`:

| Source | Companion |
| --- | --- |
| `expert_system.pl` | `expert_system.properties` |
| `script.py` | `script.properties` |
| `Main.java` | `Main.properties` |
| `widget.test.ts` | `widget.test.properties` |
| `Makefile` | `Makefile.properties` |

This works with any saved local source file, regardless of language. Two files with the same basename in one directory share a companion. Properties files themselves do not drive the display. Untitled, virtual and remote source files are not supported; save/copy them locally first. The extension runs on the local UI host so its HTTP server is on the same computer as your browser.

The `.properties` file is UTF-8 sectioned plain text, **not Java Properties syntax**:

```text
[introduction]
This expert system checks eligibility using facts and rules.
This overview stays visible while the line explanation changes.

[1]
This is a Prolog fact.
It declares information in the knowledge base.

[3-5]
This is an eligibility rule.
The :- symbol means IF.
The comma represents logical AND.

This second paragraph is preserved.

[7]
This is the entry point.
It executes the main logic.
```

- Lines are 1-based; ranges include both endpoints.
- Each header occupies a whole line: `[N]`, `[N-M]`, or the optional `[introduction]`. Surrounding whitespace is allowed.
- All following text belongs to that section until the next header. Punctuation, quotes, backslashes, HTML-looking text, indentation and internal blank lines are literal. No escaping is necessary.
- Separator blank lines at the start/end of each section are removed; internal paragraphs and line breaks are preserved. An empty section displays an empty explanation.
- The narrowest matching range wins. For equal widths (including duplicate headers), the first section wins.
- Text before the first header is ignored. Numeric headers with zero, reversed ranges or unsafe integer values discard that section. Other lines are literal text; a malformed header such as `[abc]` is not a header.
- A literal whole line matching `[N]` or `[N-M]` is necessarily a header; the format has no escape mechanism.
- With no match, missing/empty/deleted properties, or no source editor, the last displayed explanation and its original filename/range stay visible. Before the first match, the browser shows a waiting message.
- The primary cursor's active position controls the display. Line numbers are fixed mappings: update them if source edits shift code.

## Commands

| Command | Behavior |
| --- | --- |
| **Code Help: Start** | Start listening if necessary and open the browser display. |
| **Code Help: Stop** | Dispose listeners/watchers and close all SSE connections and the server. |
| **Code Help: Open Window** | Open the current display; start the server if stopped. |
| **Code Help: Reload Explanations** | Reload the active source's saved companion immediately. Does not start a stopped server. |

Activation is command-driven. Nothing runs until Start/Open Window. Multiple displays can connect to the same session; new/reconnecting displays receive the latest explanation. A fresh Start after Stop gets a new URL. Cursor events never open windows.

## Package and install in normal VS Code

From the project root:

```sh
npm install
npm test
npm run package
code --install-extension ./code-help-1.0.1.vsix
```

For reproducible installs after the first setup, use `npm ci` instead of `npm install`; the lockfile is included. Packaging compiles automatically and uses the development-only `@vscode/vsce` tool. No Marketplace account or publishing token is needed. `code-help-local` is a local package publisher identifier; replace it with your registered publisher before Marketplace publication.

Alternatively, in normal VS Code open Extensions → **… → Install from VSIX…**, select `code-help-1.0.1.vsix`, then reload VS Code if prompted. Open your source project and run **Code Help: Start**. Node/npm are only build requirements, not requirements for installed users.

## GitHub Actions and releases

The **Build VSIX** workflow runs on pushes to `main`, pull requests, version tags, and manual **Run workflow** requests. It installs locked development dependencies with `npm ci`, compiles and tests the extension, packages it, and uploads the VSIX as a downloadable artifact. Only the compiled extension, browser assets, examples, README, license and package manifest are shipped.

To publish a new downloadable release:

1. Update `version` in `package.json` and run `npm install --package-lock-only` to update the lockfile.
2. Commit and push the change to `main`.
3. Tag that commit with the same version and push the tag. For example, for version `1.0.2`:

   ```sh
   git tag v1.0.2
   git push origin v1.0.2
   ```

The workflow checks that the tag matches `package.json`, builds the VSIX, and creates a public GitHub Release with the VSIX attached. It uses GitHub's automatic token; no personal token or Marketplace account is needed. Build jobs have read-only repository access; only the tag release job receives permission to create a release. See [GitHub's artifact documentation](https://docs.github.com/actions/using-workflows/storing-workflow-data-as-artifacts).

## Validation

```sh
npm test
npm run test:integration
```

`npm test` compiles and runs parser and HTTP/SSE tests. The integration test launches a real VS Code extension host, opens a browser via Start, and checks cursor selections, range precedence, retention, saved-file watcher reload, atomic replacement, deletion/recreation, switching source tabs, explicit reload, and Stop. The first run downloads a test VS Code build. To use your existing desktop installation instead:

```powershell
$env:VSCODE_EXECUTABLE_PATH = "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe"
npm.cmd run test:integration
```

Use the equivalent absolute executable path on other systems. The integration test creates and removes its own temporary source files. It does not install the extension into your normal profile.

## Design and resource use

`onDidChangeTextEditorSelection` and `onDidChangeActiveTextEditor` drive updates. Only the active source's parsed sections are kept in memory; cursor movements perform no disk I/O. A single nonrecursive directory watcher detects companion creation, changes, deletion and atomic saves, including sources outside a workspace. Switching sources disposes the previous watcher and reads the next companion. Revision checks discard stale asynchronous reads after tab changes, subsequent reloads or shutdown.

Node's built-in HTTP server binds exclusively to `127.0.0.1` on an available port. A random session URL, Host/Origin checks and a restrictive content policy limit access. Explanation strings are sent via SSE and rendered with `textContent`, never as HTML. JSON is used only as the internal SSE wire encoding, never for explanation storage. No source code or explanation text leaves your computer. A slow client is disconnected and reconnects to the current snapshot. There are no heartbeat timers or polling loops; browsers reconnect SSE after connection loss. Extension shutdown closes connections and releases the port.

Files: `src/properties.ts` (parser), `src/extension.ts` (VS Code lifecycle), `src/server.ts` (HTTP/SSE), `web/` (display), `examples/` (Prolog demo), `test/` (verification). There are no runtime npm dependencies.

VS Code references: [API](https://code.visualstudio.com/api/references/vscode-api), [packaging extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension).
