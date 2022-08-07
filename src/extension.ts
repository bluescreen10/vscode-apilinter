import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { APILinter } from "./api-linter";

const diagnostics = vscode.languages.createDiagnosticCollection("apiLinter");

function findConfigFile(
  workspaceDir: string,
  configFilePath: string
): string | undefined {
  if (path.isAbsolute(configFilePath) && fs.existsSync(configFilePath)) {
    return configFilePath;
  }
  configFilePath = path.join(workspaceDir, configFilePath);
  if (fs.existsSync(configFilePath)) {
    return configFilePath;
  }
}

export function activate(context: vscode.ExtensionContext) {
  const channel = vscode.window.createOutputChannel("API Linter");
  const linter = new APILinter(channel);

  vscode.commands.registerCommand("apiLinter.run", () => {
    let editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const doc = editor.document;
    switch (doc.languageId) {
      case "proto3":
      case "proto":
        break;
      default:
        return;
    }

    const config = vscode.workspace.getConfiguration("apiLinter");

    // Set the command and check for existence.
    linter.setCommand(config.get("command") as string[]);
    if (!linter.isInstalled()) {
      vscode.window.showErrorMessage(
        "`api-linter` is not installed. Follow the instructions here: https://linter.aip.dev/#installation"
      );
      return;
    }

    // Set other options.
    linter.setConfigFile(
      findConfigFile(
        vscode.workspace.getWorkspaceFolder(doc.uri)!.uri.fsPath,
        config.get("configFile") as string
      )
    );
    linter.setProtoPaths(config.get("protoPaths") as string[]);

    diagnostics.set(doc.uri, linter.lint(doc.fileName));
  });

  vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
    vscode.commands.executeCommand("apiLinter.run");
  });
}

export function deactivate() {
  diagnostics.clear();
}
