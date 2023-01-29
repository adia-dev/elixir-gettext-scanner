import path = require("path");
import * as vscode from "vscode";
import Scanner from "./scanner";
import {
  Gettext,
  GettextProvider,
} from "./views/providers/GettextTreeDataProvider";

export function activate(context: vscode.ExtensionContext) {
  const rootPath =
    vscode.workspace.workspaceFolders &&
    vscode.workspace.workspaceFolders.length > 0
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : undefined;
  const config = vscode.workspace.getConfiguration("gettext-scanner");
  const scanner = new Scanner();
  const scanPath = config.get("scanPath");
  let poFilesPath = config.get("poFilesPath");

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

  if (!poFilesPath) {
    vscode.window.showErrorMessage("No po files path found");
    poFilesPath = "priv/gettext";
  }

  const scanPathAbs = path.resolve(rootPath, scanPath as string);
  const poFilesPathAbs = path.resolve(rootPath, poFilesPath as string);
  const gettextProvider: GettextProvider = new GettextProvider(
    scanner,
    rootPath
  );

  const disposable = vscode.commands.registerCommand(
    "gettext-scanner.scan",
    async () => {
      await scanner.scan(scanPathAbs);

      vscode.window.showInformationMessage(
        `Scanned ${scanPathAbs}, and found ${scanner.msgIdMap.size} translatable strings`
      );
    }
  );

  const refreshDisposable = vscode.commands.registerCommand(
    "gettext-scanner.refresh",
    async () => {
      scanner.msgIdMap.clear();
      await scanner.scanExistingMsgIds(poFilesPathAbs);
      await scanner.scan(scanPathAbs);

      gettextProvider.refresh();

      vscode.window.showInformationMessage(
        `Refreshed ${scanPathAbs}, and found ${scanner.msgIdMap.size} translatable strings`
      );
    }
  );

  vscode.window.registerTreeDataProvider("gettextMsgids", gettextProvider);

  vscode.commands.registerCommand(
    "gettext-scanner.scanAndRefresh",
    async () => {
      await scanner.scanExistingMsgIds(poFilesPathAbs);
      await scanner.scan(scanPathAbs);
      gettextProvider.refresh();

      vscode.window.showInformationMessage(
        `Scanned and refreshed ${scanPathAbs}, and found ${scanner.msgIdMap.size} translatable strings`
      );
    }
  );

  vscode.commands.registerCommand(
    "gettext-scanner.copyMsgid",
    async (msgid: Gettext) => {
      await vscode.env.clipboard.writeText(msgid.label);
    }
  );

  context.subscriptions.push(refreshDisposable);
  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
