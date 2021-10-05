import * as vscode from 'vscode';
import * as cp from 'child_process';
import { MessageChannel } from 'worker_threads';

type Output = {
  file_path: string;
  problems: Problem[];
};

type Problem = {
  message: string;
  rule_id: string;
  rule_doc_uri: string;
  location: Location;
};

type Location = {
  start_position: Position;
  end_position: Position;
};

type Position = {
  line_number: number;
  column_number: number;
};

export function lint(
  file: string,
  configFile: string | undefined,
  channel: vscode.OutputChannel
): vscode.Diagnostic[] {
  const args = [file, '--output-format', 'json'];

  if (configFile) {
    args.push('--config', configFile);
  }

  const result = cp.spawnSync('api-linter', args);
  if (result.status !== 0) {
    channel.appendLine(result.stderr);
    vscode.window.showErrorMessage('Error running api-linter');
    return [];
  }

  const output: Output[] = JSON.parse(result.stdout);
  if (output.length !== 1) {
    return [];
  }

  return output[0].problems.map((p) => {
    const problem = new vscode.Diagnostic(
      toRange(p.location),
      p.message,
      vscode.DiagnosticSeverity.Warning
    );
    problem.code = {
      target: vscode.Uri.parse(p.rule_doc_uri),
      value: p.rule_id,
    };

    return problem;
  });
}

export function isInstalled(): boolean {
  const result = cp.spawnSync('api-linter', ['-h']);
  return result.status === 2;
}

function toRange(location: Location): vscode.Range {
  const start = new vscode.Position(
    location.start_position.line_number - 1,
    location.start_position.column_number - 1
  );
  const end = new vscode.Position(
    location.end_position.line_number - 1,
    location.end_position.column_number - 1
  );
  return new vscode.Range(start, end);
}
