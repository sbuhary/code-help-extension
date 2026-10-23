import * as vscode from 'vscode';
import * as path from 'node:path';
import { companionPath, Explanation, findExplanation, parseExplanationFile } from './properties';
import { ExplanationServer } from './server';

let controller: Explainer | undefined;

class Explainer {
  private readonly server = new ExplanationServer();
  private subscriptions: vscode.Disposable[] = [];
  private watcher: vscode.FileSystemWatcher | undefined;
  private source: string | undefined;
  private sections: Explanation[] = [];
  private revision = 0;
  private running = false;
  private queue: Promise<unknown> = Promise.resolve();
  private readonly output = vscode.window.createOutputChannel('Code Help');

  constructor(private readonly context: vscode.ExtensionContext) {}

  command(action: () => Promise<unknown>): Promise<unknown> {
    const next = this.queue.then(action);
    this.queue = next.catch(error => {
      this.output.appendLine(String(error));
      void vscode.window.showErrorMessage(`Code Help: ${String(error)}`);
    });
    return this.queue;
  }

  async start(open: boolean): Promise<string> {
    const url = await this.server.start(path.join(this.context.extensionPath, 'web'));
    if (!this.running) {
      this.running = true;
      this.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection(event => {
          if (event.textEditor === vscode.window.activeTextEditor) { this.update(); }
        }),
        vscode.window.onDidChangeActiveTextEditor(() => this.update())
      );
      this.output.appendLine(`Listening at ${url}`);
      this.update();
    }
    if (open && !await vscode.env.openExternal(vscode.Uri.parse(url))) {
      void vscode.window.showWarningMessage(`Open this URL in your browser: ${url}`);
    }
    return url;
  }

  private update(): void {
    if (!this.running) { return; }
    const editor = vscode.window.activeTextEditor;
    const source = editor?.document.uri.scheme === 'file' && path.extname(editor.document.fileName).toLowerCase() !== '.properties'
      ? editor.document.fileName : undefined;
    if (source !== this.source) {
      this.revision++;
      this.watcher?.dispose();
      this.watcher = undefined;
      this.source = source;
      this.sections = [];
      if (source) {
        this.server.publishIntroduction({ filename: path.basename(source), text: '' });
        const companion = companionPath(source);
        // Watch the directory so atomic saves and creation of a missing companion work too.
        const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(path.dirname(companion), '*'));
        this.watcher = watcher;
        const changed = (uri: vscode.Uri) => {
          if (uri.toString() === vscode.Uri.file(companion).toString()) { void this.reload(); }
        };
        watcher.onDidCreate(changed);
        watcher.onDidChange(changed);
        watcher.onDidDelete(changed);
        void this.reload();
      }
      return;
    }
    if (!editor || !source) { return; }
    const match = findExplanation(this.sections, editor.selection.active.line + 1);
    if (match) { this.server.publish({ filename: path.basename(source), ...match }); }
  }

  async reload(): Promise<void> {
    const source = this.source;
    if (!source || !this.running) { return; }
    const revision = ++this.revision;
    try {
      const bytes = await vscode.workspace.fs.readFile(vscode.Uri.file(companionPath(source)));
      if (revision !== this.revision || !this.running) { return; }
      const parsed = parseExplanationFile(Buffer.from(bytes).toString('utf8'));
      this.sections = parsed.sections;
      this.server.publishIntroduction({ filename: path.basename(source), text: parsed.introduction });
    } catch (error) {
      if (revision !== this.revision || !this.running) { return; }
      this.sections = [];
      this.server.publishIntroduction({ filename: path.basename(source), text: '' });
      if (!(error instanceof vscode.FileSystemError && error.code === 'FileNotFound')) {
        this.output.appendLine(`Cannot read ${companionPath(source)}: ${String(error)}`);
      }
    }
    this.update();
  }

  async stop(): Promise<void> {
    this.running = false;
    this.revision++;
    this.watcher?.dispose();
    this.watcher = undefined;
    this.subscriptions.forEach(subscription => subscription.dispose());
    this.subscriptions = [];
    this.source = undefined;
    this.sections = [];
    await this.server.stop();
  }

  async dispose(): Promise<void> {
    await this.queue;
    await this.stop();
    this.output.dispose();
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const explainer = controller = new Explainer(context);
  context.subscriptions.push(
    vscode.commands.registerCommand('codeHelp.start', () => explainer.command(() => explainer.start(true))),
    vscode.commands.registerCommand('codeHelp.stop', () => explainer.command(() => explainer.stop())),
    vscode.commands.registerCommand('codeHelp.openWindow', () => explainer.command(() => explainer.start(true))),
    vscode.commands.registerCommand('codeHelp.reload', () => explainer.command(() => explainer.reload()))
  );
}

export async function deactivate(): Promise<void> {
  await controller?.dispose();
  controller = undefined;
}
