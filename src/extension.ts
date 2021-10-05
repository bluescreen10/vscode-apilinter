import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as api from './api-linter';

type Config = {
  configDir: string;
};

const diagnostics = vscode.languages.createDiagnosticCollection('apiLinter');

export function activate(context: vscode.ExtensionContext) {
  let chan = vscode.window.createOutputChannel('API Linter');

  if (!api.isInstalled()) {
    vscode.window.showErrorMessage(
      'api-linter not installed. Follow instructions here: https://linter.aip.dev/#installation'
    );
  }

  vscode.commands.registerCommand('apiLinter.run', () => {
    let editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const doc = editor.document;
    if (doc.languageId !== 'proto3' && doc.languageId !== 'proto') {
      return;
    }

    const config: vscode.WorkspaceConfiguration =
      vscode.workspace.getConfiguration('apiLinter');
    const workspaceDir = vscode.workspace.getWorkspaceFolder(doc.uri)?.uri
      .fsPath;

    const configFile = [config.configDir, workspaceDir]
      .map((dir) => {
        return path.join(dir, '.apilinter.yml');
      })
      .find((fullPath) => {
        return fs.existsSync(fullPath);
      });

    diagnostics.set(doc.uri, api.lint(doc.fileName, configFile, chan));
  });

  vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
    vscode.commands.executeCommand('apiLinter.run');
  });
}

export function deactivate() {
  diagnostics.clear();
}
