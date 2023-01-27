import path = require("path");
import * as vscode from "vscode";
import Scanner from "./scanner";

export function activate(context: vscode.ExtensionContext) {
  const rootPath =
    vscode.workspace.workspaceFolders &&
    vscode.workspace.workspaceFolders.length > 0
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : undefined;
  const config = vscode.workspace.getConfiguration("gettext-scanner");
  const scanner = new Scanner();
  const scanPath = config.get("scanPath");

  if (!config.get("enabled")) {
    vscode.window.showInformationMessage("Gettext Scanner is disabled");
    return;
  }

  if (!rootPath) {
    vscode.window.showErrorMessage("No workspace found");
    return;
  }

  if (!scanPath) {
    vscode.window.showErrorMessage("No scan path found");
    return;
  }

  const scanPathAbs = path.resolve(rootPath, scanPath as string);

  const disposable = vscode.commands.registerCommand(
    "gettext-scanner.scan",
    async () => {
      await scanner.scan(scanPathAbs);

      vscode.window.showInformationMessage(
        `Scanned ${scanPathAbs}, and found ${scanner.msgIdMap.size} translatable strings`
      );
    }
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
